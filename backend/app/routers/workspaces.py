"""
Workspace read + document + flashcard endpoints (all user-scoped).

  GET   /workspaces                                  -> dashboard grid
  GET   /workspaces/{id}/documents                   -> documents in the workspace
  GET   /workspaces/{id}/reviewer[?document_id=...]  -> a document's Master Reviewer
  PATCH /workspaces/{id}/documents/{document_id}     -> change a document's study mode
  GET   /workspaces/{id}/flashcards                  -> saved flashcards
  POST  /workspaces/{id}/flashcards                  -> save a flashcard (widget spawning)

Endpoints that operate on a single document accept an optional `document_id`;
when omitted they resolve to the workspace's primary (newest) document, so the
existing single-document frontend keeps working unchanged.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user_id
from app.db import get_repository
from app.schemas.ingest import IngestPayload
from app.schemas.workspace import (
    DocumentSummary,
    FlashcardCreate,
    FlashcardRecord,
    StudyModeLiteral,
    WorkspaceSummary,
    doc_to_summary,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class DocumentModeUpdate(BaseModel):
    mode: StudyModeLiteral


@router.get("", response_model=list[WorkspaceSummary])
async def list_workspaces(user_id: str = Depends(get_current_user_id)) -> list[WorkspaceSummary]:
    return await get_repository().list_workspaces(user_id=user_id)


@router.get("/{workspace_id}/documents", response_model=list[DocumentSummary])
async def list_documents(
    workspace_id: str, user_id: str = Depends(get_current_user_id)
) -> list[DocumentSummary]:
    record = await get_repository().get_workspace(user_id=user_id, workspace_id=workspace_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return [doc_to_summary(d) for d in record.documents]


@router.get("/{workspace_id}/reviewer", response_model=IngestPayload)
async def get_reviewer(
    workspace_id: str,
    document_id: str | None = None,
    user_id: str = Depends(get_current_user_id),
) -> IngestPayload:
    document = await get_repository().get_document(
        user_id=user_id, workspace_id=workspace_id, document_id=document_id
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document.reviewer


@router.patch("/{workspace_id}/documents/{document_id}", response_model=DocumentSummary)
async def update_document_mode(
    workspace_id: str,
    document_id: str,
    body: DocumentModeUpdate,
    user_id: str = Depends(get_current_user_id),
) -> DocumentSummary:
    try:
        document = await get_repository().set_document_mode(
            user_id=user_id, workspace_id=workspace_id, document_id=document_id, mode=body.mode
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Document not found.") from exc
    return doc_to_summary(document)


@router.get("/{workspace_id}/flashcards", response_model=list[FlashcardRecord])
async def list_flashcards(
    workspace_id: str, user_id: str = Depends(get_current_user_id)
) -> list[FlashcardRecord]:
    return await get_repository().list_flashcards(user_id=user_id, workspace_id=workspace_id)


@router.post("/{workspace_id}/flashcards", response_model=FlashcardRecord, status_code=201)
async def add_flashcard(
    workspace_id: str,
    card: FlashcardCreate,
    user_id: str = Depends(get_current_user_id),
) -> FlashcardRecord:
    try:
        return await get_repository().add_flashcard(
            user_id=user_id, workspace_id=workspace_id, card=card
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workspace not found.") from exc
