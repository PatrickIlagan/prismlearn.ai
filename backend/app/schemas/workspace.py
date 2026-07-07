"""
Persistence-facing contracts: stored workspaces and flashcards.

`WorkspaceSummary` mirrors the frontend `WorkspaceSummary` (prism.ts) so the
dashboard grid renders straight from the list endpoint.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.ingest import IngestPayload, SourceType


class WorkspaceRecord(BaseModel):
    """Full stored workspace, including its Master Reviewer."""

    id: str
    user_id: str
    title: str
    source_type: SourceType
    reviewer: IngestPayload
    created_at: datetime


class WorkspaceSummary(BaseModel):
    """Lightweight row for the dashboard grid (no reviewer body)."""

    id: str
    title: str
    source_type: SourceType
    concept_count: int
    created_at: datetime


class FlashcardCreate(BaseModel):
    front: str
    back: str
    anchor_id: str | None = None


class FlashcardRecord(FlashcardCreate):
    id: str
    workspace_id: str
    created_at: datetime


def to_summary(record: WorkspaceRecord) -> WorkspaceSummary:
    return WorkspaceSummary(
        id=record.id,
        title=record.title,
        source_type=record.source_type,
        concept_count=len(record.reviewer.table_of_contents),
        created_at=record.created_at,
    )
