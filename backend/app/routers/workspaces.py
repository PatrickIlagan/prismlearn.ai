"""
Workspace read + flashcard endpoints (all user-scoped).

  GET  /workspaces                        -> dashboard grid
  GET  /workspaces/{id}/reviewer          -> Master Reviewer for the workspace
  GET  /workspaces/{id}/flashcards        -> saved flashcards
  POST /workspaces/{id}/flashcards        -> save a flashcard (widget spawning)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user_id
from app.db import get_repository
from app.schemas.ingest import IngestPayload
from app.schemas.workspace import FlashcardCreate, FlashcardRecord, WorkspaceSummary

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceSummary])
async def list_workspaces(user_id: str = Depends(get_current_user_id)) -> list[WorkspaceSummary]:
    return await get_repository().list_workspaces(user_id=user_id)


@router.get("/{workspace_id}/reviewer", response_model=IngestPayload)
async def get_reviewer(
    workspace_id: str, user_id: str = Depends(get_current_user_id)
) -> IngestPayload:
    record = await get_repository().get_workspace(user_id=user_id, workspace_id=workspace_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return record.reviewer


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
