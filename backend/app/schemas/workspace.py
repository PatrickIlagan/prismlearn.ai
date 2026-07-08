"""
Persistence-facing contracts: workspaces (containers), their documents, and flashcards.

A **workspace** is a container the user creates; it holds one or more **documents**
(each an ingested PDF/PPTX/YouTube source with its own Master Reviewer and a study
`mode`: "learn" for first-time teaching, "review" for a recap that still walks the
document). `WorkspaceSummary` mirrors the frontend dashboard row.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field

from app.schemas.ingest import IngestPayload, SourceType

StudyModeLiteral = Literal["learn", "review"]


class DocumentRecord(BaseModel):
    """One ingested source within a workspace, including its Master Reviewer."""

    id: str
    workspace_id: str
    title: str
    source_type: SourceType
    reviewer: IngestPayload
    mode: StudyModeLiteral = "learn"
    created_at: datetime


class DocumentSummary(BaseModel):
    """Lightweight document row (no reviewer body) for lists."""

    id: str
    title: str
    source_type: SourceType
    mode: StudyModeLiteral
    concept_count: int
    created_at: datetime


class WorkspaceRecord(BaseModel):
    """A workspace container plus its documents (newest first)."""

    id: str
    user_id: str
    title: str
    created_at: datetime
    documents: List[DocumentRecord] = Field(default_factory=list)

    def primary_document(self) -> DocumentRecord | None:
        """The document endpoints fall back to when no document_id is given."""
        return self.documents[0] if self.documents else None

    def find_document(self, document_id: str | None) -> DocumentRecord | None:
        if document_id is None:
            return self.primary_document()
        return next((d for d in self.documents if d.id == document_id), None)


class WorkspaceSummary(BaseModel):
    """Dashboard grid row. Reports the first document's type + aggregate counts so
    the existing single-document card keeps rendering."""

    id: str
    title: str
    source_type: SourceType
    concept_count: int
    document_count: int
    created_at: datetime


class FlashcardCreate(BaseModel):
    front: str
    back: str
    anchor_id: str | None = None


class FlashcardRecord(FlashcardCreate):
    id: str
    workspace_id: str
    created_at: datetime


def doc_to_summary(doc: DocumentRecord) -> DocumentSummary:
    return DocumentSummary(
        id=doc.id,
        title=doc.title,
        source_type=doc.source_type,
        mode=doc.mode,
        concept_count=len(doc.reviewer.table_of_contents),
        created_at=doc.created_at,
    )


def to_summary(record: WorkspaceRecord) -> WorkspaceSummary:
    primary = record.primary_document()
    return WorkspaceSummary(
        id=record.id,
        title=record.title,
        # Fall back to 'pdf' when a container has no documents yet.
        source_type=primary.source_type if primary else SourceType.pdf,
        concept_count=sum(len(d.reviewer.table_of_contents) for d in record.documents),
        document_count=len(record.documents),
        created_at=record.created_at,
    )
