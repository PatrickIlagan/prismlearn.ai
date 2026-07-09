"""
Agentic tutor endpoint ([MODE: TUTOR]).

POST /workspaces/{workspace_id}/tutor runs one scaffolding turn and returns a
TutorResponse the frontend's Zustand `applyTutorResponse` reducer consumes directly.

The Master Reviewer is loaded server-side from the repository by (user_id,
workspace_id). A `reviewer` may still be supplied in the body as a fallback for
workspaces that aren't persisted (e.g. mock-created ids); the persisted copy wins.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user_id
from app.db import get_repository
from app.schemas.ingest import IngestPayload
from app.schemas.tutor import TutorRequest, TutorResponse
from app.services.ai_client import InferenceError, run_tutor

router = APIRouter(prefix="/workspaces", tags=["tutor"])


class TutorTurnRequest(TutorRequest):
    # Which document in the workspace to tutor; defaults to the primary document.
    document_id: str | None = None
    # Optional fallback; the persisted reviewer is preferred when available.
    reviewer: IngestPayload | None = None


@router.post("/{workspace_id}/tutor", response_model=TutorResponse)
async def tutor_turn(
    workspace_id: str,
    body: TutorTurnRequest,
    user_id: str = Depends(get_current_user_id),
) -> TutorResponse:
    document = await get_repository().get_document(
        user_id=user_id, workspace_id=workspace_id, document_id=body.document_id
    )
    if document is not None:
        reviewer = document.reviewer
        # The document's saved study mode is authoritative for learn vs review.
        body.session_mode = document.mode
    else:
        reviewer = body.reviewer
    if reviewer is None:
        raise HTTPException(status_code=404, detail="Workspace reviewer not found.")

    anchor_ids = [entry.anchor_id for entry in reviewer.table_of_contents]
    try:
        return await run_tutor(
            body,
            markdown_content=reviewer.markdown_content,
            anchor_ids=anchor_ids,
        )
    except InferenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
