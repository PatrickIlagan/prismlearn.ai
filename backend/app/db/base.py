"""Abstract persistence interface. All access is scoped by user_id (RLS parity)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.ingest import IngestPayload, SourceType
from app.schemas.workspace import FlashcardCreate, FlashcardRecord, WorkspaceRecord, WorkspaceSummary


class WorkspaceRepository(ABC):
    @abstractmethod
    async def create_workspace(
        self,
        *,
        user_id: str,
        title: str,
        source_type: SourceType,
        reviewer: IngestPayload,
    ) -> WorkspaceRecord: ...

    @abstractmethod
    async def get_workspace(self, *, user_id: str, workspace_id: str) -> WorkspaceRecord | None: ...

    @abstractmethod
    async def list_workspaces(self, *, user_id: str) -> list[WorkspaceSummary]: ...

    @abstractmethod
    async def add_flashcard(
        self, *, user_id: str, workspace_id: str, card: FlashcardCreate
    ) -> FlashcardRecord: ...

    @abstractmethod
    async def list_flashcards(
        self, *, user_id: str, workspace_id: str
    ) -> list[FlashcardRecord]: ...
