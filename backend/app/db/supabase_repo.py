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
from app.schemas.ingest import IngestPayload, SourceType
from app.schemas.workspace import (
    FlashcardCreate,
    FlashcardRecord,
    WorkspaceRecord,
    WorkspaceSummary,
    to_summary,
)

_WORKSPACES = "workspaces"
_FLASHCARDS = "flashcards"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseRepository(WorkspaceRepository):
    def __init__(self) -> None:
        self._client: Client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )

    def _record_from_row(self, row: dict) -> WorkspaceRecord:
        return WorkspaceRecord(
            id=row["id"],
            user_id=row["user_id"],
            title=row["title"],
            source_type=SourceType(row["source_type"]),
            reviewer=IngestPayload.model_validate(row["reviewer"]),
            created_at=row["created_at"],
        )

    async def create_workspace(
        self,
        *,
        user_id: str,
        title: str,
        source_type: SourceType,
        reviewer: IngestPayload,
    ) -> WorkspaceRecord:
        row = {
            "id": uuid.uuid4().hex,
            "user_id": user_id,
            "title": title,
            "source_type": source_type.value,
            "reviewer": reviewer.model_dump(),
            "created_at": _now_iso(),
        }

        def _insert() -> dict:
            resp = self._client.table(_WORKSPACES).insert(row).execute()
            return resp.data[0]

        inserted = await anyio.to_thread.run_sync(_insert)
        return self._record_from_row(inserted)

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
        return self._record_from_row(rows[0]) if rows else None

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
        return [to_summary(self._record_from_row(r)) for r in rows]

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
