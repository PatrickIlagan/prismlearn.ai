"""Abstract persistence interface. All access is scoped by user_id (RLS parity)."""

from __future__ import annotations

from abc import ABC, abstractmethod

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
)


class WorkspaceRepository(ABC):
    # ---------- Workspaces (containers) + documents ----------

    @abstractmethod
    async def create_workspace(self, *, user_id: str, title: str) -> WorkspaceRecord:
        """Create an empty workspace container."""

    @abstractmethod
    async def add_document(
        self,
        *,
        user_id: str,
        workspace_id: str,
        title: str,
        source_type: SourceType,
        reviewer: IngestPayload,
        mode: StudyModeLiteral = "learn",
    ) -> DocumentRecord: ...

    async def create_workspace_with_document(
        self,
        *,
        user_id: str,
        title: str,
        source_type: SourceType,
        reviewer: IngestPayload,
        mode: StudyModeLiteral = "learn",
    ) -> tuple[WorkspaceRecord, DocumentRecord]:
        """Convenience for ingest: a new container seeded with its first document."""
        workspace = await self.create_workspace(user_id=user_id, title=title)
        document = await self.add_document(
            user_id=user_id,
            workspace_id=workspace.id,
            title=title,
            source_type=source_type,
            reviewer=reviewer,
            mode=mode,
        )
        return workspace, document

    @abstractmethod
    async def get_workspace(self, *, user_id: str, workspace_id: str) -> WorkspaceRecord | None: ...

    async def get_document(
        self, *, user_id: str, workspace_id: str, document_id: str | None = None
    ) -> DocumentRecord | None:
        """Resolve a document by id, or the workspace's primary document when omitted."""
        workspace = await self.get_workspace(user_id=user_id, workspace_id=workspace_id)
        if workspace is None:
            return None
        return workspace.find_document(document_id)

    @abstractmethod
    async def set_document_mode(
        self, *, user_id: str, workspace_id: str, document_id: str, mode: StudyModeLiteral
    ) -> DocumentRecord: ...

    @abstractmethod
    async def rename_workspace(
        self, *, user_id: str, workspace_id: str, title: str
    ) -> WorkspaceRecord: ...

    @abstractmethod
    async def update_document(
        self,
        *,
        user_id: str,
        workspace_id: str,
        document_id: str,
        title: str | None = None,
        reviewer: IngestPayload | None = None,
    ) -> DocumentRecord:
        """Rename a document and/or edit its Master Reviewer content (what the
        tutor teaches from)."""

    @abstractmethod
    async def delete_workspace(self, *, user_id: str, workspace_id: str) -> None:
        """Deletes the workspace and (via FK cascade) its documents/flashcards/mastery."""

    @abstractmethod
    async def delete_document(
        self, *, user_id: str, workspace_id: str, document_id: str
    ) -> None: ...

    @abstractmethod
    async def list_workspaces(self, *, user_id: str) -> list[WorkspaceSummary]: ...

    # ---------- Flashcards ----------

    @abstractmethod
    async def add_flashcard(
        self, *, user_id: str, workspace_id: str, card: FlashcardCreate
    ) -> FlashcardRecord: ...

    @abstractmethod
    async def list_flashcards(
        self, *, user_id: str, workspace_id: str
    ) -> list[FlashcardRecord]: ...

    # ---------- Gamification ----------

    @abstractmethod
    async def get_profile(self, *, user_id: str) -> PlayerProfile: ...

    @abstractmethod
    async def upsert_profile(self, *, user_id: str, patch: ProfileUpsert) -> PlayerProfile: ...

    @abstractmethod
    async def list_mastery(
        self, *, user_id: str, workspace_id: str
    ) -> list[ConceptMasteryRecord]: ...

    @abstractmethod
    async def upsert_mastery(
        self,
        *,
        user_id: str,
        workspace_id: str,
        anchor_id: str,
        patch: ConceptMasteryUpsert,
    ) -> ConceptMasteryRecord: ...
