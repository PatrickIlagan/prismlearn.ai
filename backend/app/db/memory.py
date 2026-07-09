"""
In-memory repository for local dev and tests.

Not durable (process-scoped) but fully implements the interface, including per-user
isolation so behavior matches the RLS-enforced Supabase repo.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

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


def _now() -> datetime:
    return datetime.now(timezone.utc)


class InMemoryRepository(WorkspaceRepository):
    def __init__(self) -> None:
        self._profiles: dict[str, PlayerProfile] = {}
        # (user_id, workspace_id, anchor_id) -> record
        self._mastery: dict[tuple[str, str, str], ConceptMasteryRecord] = {}
        self._workspaces: dict[str, WorkspaceRecord] = {}
        self._flashcards: dict[str, list[FlashcardRecord]] = {}

    async def create_workspace(self, *, user_id: str, title: str) -> WorkspaceRecord:
        record = WorkspaceRecord(
            id=uuid.uuid4().hex,
            user_id=user_id,
            title=title,
            created_at=_now(),
            documents=[],
        )
        self._workspaces[record.id] = record
        return record

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
        workspace = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if workspace is None:
            raise KeyError("workspace not found for user")
        document = DocumentRecord(
            id=uuid.uuid4().hex,
            workspace_id=workspace_id,
            title=title,
            source_type=source_type,
            reviewer=reviewer,
            mode=mode,
            created_at=_now(),
        )
        # Newest first, matching the Supabase ordering.
        workspace.documents.insert(0, document)
        return document

    async def get_workspace(self, *, user_id: str, workspace_id: str) -> WorkspaceRecord | None:
        record = self._workspaces.get(workspace_id)
        if record is None or record.user_id != user_id:
            return None
        return record

    async def set_document_mode(
        self, *, user_id: str, workspace_id: str, document_id: str, mode: StudyModeLiteral
    ) -> DocumentRecord:
        workspace = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        doc = workspace.find_document(document_id) if workspace else None
        if doc is None:
            raise KeyError("document not found for user")
        doc.mode = mode
        return doc

    async def rename_workspace(
        self, *, user_id: str, workspace_id: str, title: str
    ) -> WorkspaceRecord:
        workspace = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if workspace is None:
            raise KeyError("workspace not found for user")
        workspace.title = title
        return workspace

    async def update_document(
        self,
        *,
        user_id: str,
        workspace_id: str,
        document_id: str,
        title: str | None = None,
        reviewer: IngestPayload | None = None,
    ) -> DocumentRecord:
        workspace = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        doc = workspace.find_document(document_id) if workspace else None
        if doc is None:
            raise KeyError("document not found for user")
        if title is not None:
            doc.title = title
        if reviewer is not None:
            doc.reviewer = reviewer
        return doc

    async def delete_workspace(self, *, user_id: str, workspace_id: str) -> None:
        workspace = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if workspace is None:
            raise KeyError("workspace not found for user")
        del self._workspaces[workspace_id]
        self._flashcards.pop(workspace_id, None)
        for key in [k for k in self._mastery if k[0] == user_id and k[1] == workspace_id]:
            del self._mastery[key]

    async def delete_document(
        self, *, user_id: str, workspace_id: str, document_id: str
    ) -> None:
        workspace = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if workspace is None or workspace.find_document(document_id) is None:
            raise KeyError("document not found for user")
        workspace.documents = [d for d in workspace.documents if d.id != document_id]

    async def list_workspaces(self, *, user_id: str) -> list[WorkspaceSummary]:
        rows = [w for w in self._workspaces.values() if w.user_id == user_id]
        rows.sort(key=lambda w: w.created_at, reverse=True)
        return [to_summary(w) for w in rows]

    async def add_flashcard(
        self, *, user_id: str, workspace_id: str, card: FlashcardCreate
    ) -> FlashcardRecord:
        # Ownership check keeps parity with RLS.
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            raise KeyError("workspace not found for user")
        record = FlashcardRecord(
            id=uuid.uuid4().hex,
            workspace_id=workspace_id,
            created_at=_now(),
            **card.model_dump(),
        )
        self._flashcards.setdefault(workspace_id, []).append(record)
        return record

    async def list_flashcards(
        self, *, user_id: str, workspace_id: str
    ) -> list[FlashcardRecord]:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            return []
        return list(self._flashcards.get(workspace_id, []))

    # ---------- Gamification ----------

    async def get_profile(self, *, user_id: str) -> PlayerProfile:
        existing = self._profiles.get(user_id)
        if existing:
            return existing
        fresh = PlayerProfile(user_id=user_id, updated_at=_now())
        self._profiles[user_id] = fresh
        return fresh

    async def upsert_profile(self, *, user_id: str, patch: ProfileUpsert) -> PlayerProfile:
        current = await self.get_profile(user_id=user_id)
        data = current.model_dump()
        data.update(patch.model_dump(exclude_none=True))
        data["updated_at"] = _now()
        updated = PlayerProfile.model_validate(data)
        self._profiles[user_id] = updated
        return updated

    async def list_mastery(
        self, *, user_id: str, workspace_id: str
    ) -> list[ConceptMasteryRecord]:
        owner = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if owner is None:
            return []
        return [
            rec
            for (uid, wid, _anchor), rec in self._mastery.items()
            if uid == user_id and wid == workspace_id
        ]

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
        key = (user_id, workspace_id, anchor_id)
        current = self._mastery.get(key) or ConceptMasteryRecord(
            workspace_id=workspace_id, anchor_id=anchor_id, updated_at=_now()
        )
        data = current.model_dump()
        data.update(patch.model_dump(exclude_none=True))
        data["updated_at"] = _now()
        record = ConceptMasteryRecord.model_validate(data)
        self._mastery[key] = record
        return record
