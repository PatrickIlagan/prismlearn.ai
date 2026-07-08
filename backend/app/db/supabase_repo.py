"""
Supabase-backed repository.

supabase-py's client is synchronous, so each call is offloaded to a worker thread
(anyio.to_thread) to avoid blocking the async event loop. Row Level Security is
enforced in Postgres (see db/schema.sql); we also filter by user_id here as
defense-in-depth, since the service-role key bypasses RLS.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import anyio
from supabase import Client, create_client

from app.core.config import settings
from app.db.base import WorkspaceRepository
from app.schemas.gamification import (
    ConceptMasteryRecord,
    ConceptMasteryUpsert,
    PlayerProfile,
    ProfileUpsert,
)
from app.schemas.ingest import IngestPayload, SourceType
from app.schemas.workspace import (
    DocumentRecord,
    FlashcardCreate,
    FlashcardRecord,
    StudyModeLiteral,
    WorkspaceRecord,
    WorkspaceSummary,
    to_summary,
)

_WORKSPACES = "workspaces"
_DOCUMENTS = "documents"
_FLASHCARDS = "flashcards"
_PROFILES = "player_profiles"
_MASTERY = "concept_mastery"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseRepository(WorkspaceRepository):
    def __init__(self) -> None:
        self._client: Client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    def _document_from_row(self, row: dict) -> DocumentRecord:
        return DocumentRecord(
            id=row["id"],
            workspace_id=row["workspace_id"],
            title=row["title"],
            source_type=SourceType(row["source_type"]),
            reviewer=IngestPayload.model_validate(row["reviewer"]),
            mode=row.get("mode", "learn"),
            created_at=row["created_at"],
        )

    async def create_workspace(self, *, user_id: str, title: str) -> WorkspaceRecord:
        row = {
            "id": uuid.uuid4().hex,
            "user_id": user_id,
            "title": title,
            "created_at": _now_iso(),
        }

        def _insert() -> dict:
            resp = self._client.table(_WORKSPACES).insert(row).execute()
            return resp.data[0]

        inserted = await anyio.to_thread.run_sync(_insert)
        return WorkspaceRecord(
            id=inserted["id"],
            user_id=inserted["user_id"],
            title=inserted["title"],
            created_at=inserted["created_at"],
            documents=[],
        )

    async def add_document(
        self,
        *,
        user_id: str,
        workspace_id: str,
        title: str,
        source_type: SourceType,
        reviewer: IngestPayload,
        mode: StudyModeLiteral = "learn",
    ) -> DocumentRecord:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            raise KeyError("workspace not found for user")
        row = {
            "id": uuid.uuid4().hex,
            "workspace_id": workspace_id,
            "title": title,
            "source_type": source_type.value,
            "reviewer": reviewer.model_dump(),
            "mode": mode,
            "created_at": _now_iso(),
        }

        def _insert() -> dict:
            resp = self._client.table(_DOCUMENTS).insert(row).execute()
            return resp.data[0]

        inserted = await anyio.to_thread.run_sync(_insert)
        return self._document_from_row(inserted)

    async def _load_documents(self, workspace_id: str) -> list[DocumentRecord]:
        def _select() -> list[dict]:
            resp = (
                self._client.table(_DOCUMENTS)
                .select("*")
                .eq("workspace_id", workspace_id)
                .order("created_at", desc=True)
                .execute()
            )
            return resp.data

        rows = await anyio.to_thread.run_sync(_select)
        return [self._document_from_row(r) for r in rows]

    async def get_workspace(self, *, user_id: str, workspace_id: str) -> WorkspaceRecord | None:
        def _select() -> list[dict]:
            resp = (
                self._client.table(_WORKSPACES)
                .select("*")
                .eq("id", workspace_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            return resp.data

        rows = await anyio.to_thread.run_sync(_select)
        if not rows:
            return None
        row = rows[0]
        documents = await self._load_documents(workspace_id)
        return WorkspaceRecord(
            id=row["id"],
            user_id=row["user_id"],
            title=row["title"],
            created_at=row["created_at"],
            documents=documents,
        )

    async def set_document_mode(
        self, *, user_id: str, workspace_id: str, document_id: str, mode: StudyModeLiteral
    ) -> DocumentRecord:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None or owner.find_document(document_id) is None:
            raise KeyError("document not found for user")

        def _update() -> list[dict]:
            resp = (
                self._client.table(_DOCUMENTS)
                .update({"mode": mode})
                .eq("id", document_id)
                .eq("workspace_id", workspace_id)
                .execute()
            )
            return resp.data

        rows = await anyio.to_thread.run_sync(_update)
        return self._document_from_row(rows[0])

    async def list_workspaces(self, *, user_id: str) -> list[WorkspaceSummary]:
        def _select() -> list[dict]:
            resp = (
                self._client.table(_WORKSPACES)
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return resp.data

        rows = await anyio.to_thread.run_sync(_select)
        summaries: list[WorkspaceSummary] = []
        for r in rows:
            documents = await self._load_documents(r["id"])
            summaries.append(
                to_summary(
                    WorkspaceRecord(
                        id=r["id"],
                        user_id=r["user_id"],
                        title=r["title"],
                        created_at=r["created_at"],
                        documents=documents,
                    )
                )
            )
        return summaries

    async def add_flashcard(
        self, *, user_id: str, workspace_id: str, card: FlashcardCreate
    ) -> FlashcardRecord:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            raise KeyError("workspace not found for user")
        row = {
            "id": uuid.uuid4().hex,
            "workspace_id": workspace_id,
            "created_at": _now_iso(),
            **card.model_dump(),
        }

        def _insert() -> dict:
            resp = self._client.table(_FLASHCARDS).insert(row).execute()
            return resp.data[0]

        inserted = await anyio.to_thread.run_sync(_insert)
        return FlashcardRecord.model_validate(inserted)

    async def list_flashcards(
        self, *, user_id: str, workspace_id: str
    ) -> list[FlashcardRecord]:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            return []

        def _select() -> list[dict]:
            resp = (
                self._client.table(_FLASHCARDS)
                .select("*")
                .eq("workspace_id", workspace_id)
                .order("created_at", desc=False)
                .execute()
            )
            return resp.data

        rows = await anyio.to_thread.run_sync(_select)
        return [FlashcardRecord.model_validate(r) for r in rows]

    # ---------- Gamification ----------

    async def get_profile(self, *, user_id: str) -> PlayerProfile:
        def _select() -> list[dict]:
            resp = (
                self._client.table(_PROFILES).select("*").eq("user_id", user_id).limit(1).execute()
            )
            return resp.data

        rows = await anyio.to_thread.run_sync(_select)
        if rows:
            return PlayerProfile.model_validate(rows[0])
        # Create a default profile on first access.
        return await self.upsert_profile(user_id=user_id, patch=ProfileUpsert())

    async def upsert_profile(self, *, user_id: str, patch: ProfileUpsert) -> PlayerProfile:
        row = {"user_id": user_id, **patch.model_dump(exclude_none=True), "updated_at": _now_iso()}

        def _upsert() -> dict:
            resp = self._client.table(_PROFILES).upsert(row, on_conflict="user_id").execute()
            return resp.data[0]

        saved = await anyio.to_thread.run_sync(_upsert)
        return PlayerProfile.model_validate(saved)

    async def list_mastery(
        self, *, user_id: str, workspace_id: str
    ) -> list[ConceptMasteryRecord]:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            return []

        def _select() -> list[dict]:
            resp = (
                self._client.table(_MASTERY)
                .select("*")
                .eq("workspace_id", workspace_id)
                .execute()
            )
            return resp.data

        rows = await anyio.to_thread.run_sync(_select)
        return [ConceptMasteryRecord.model_validate(r) for r in rows]

    async def upsert_mastery(
        self,
        *,
        user_id: str,
        workspace_id: str,
        anchor_id: str,
        patch: ConceptMasteryUpsert,
    ) -> ConceptMasteryRecord:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            raise KeyError("workspace not found for user")
        row = {
            "workspace_id": workspace_id,
            "anchor_id": anchor_id,
            **patch.model_dump(exclude_none=True),
            "updated_at": _now_iso(),
        }

        def _upsert() -> dict:
            resp = (
                self._client.table(_MASTERY)
                .upsert(row, on_conflict="workspace_id,anchor_id")
                .execute()
            )
            return resp.data[0]

        saved = await anyio.to_thread.run_sync(_upsert)
        return ConceptMasteryRecord.model_validate(saved)
