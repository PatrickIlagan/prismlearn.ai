"""
Quiz generation endpoint ([MODE: QUIZ]).

POST /workspaces/{workspace_id}/quiz generates an on-demand quiz from the
workspace's Master Reviewer (loaded server-side, like the tutor endpoint), scoped
to the whole document or a single concept.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user_id
from app.db import get_repository
from app.schemas.ingest import IngestPayload
from app.schemas.quiz import Quiz, QuizRequest
from app.services.fireworks import InferenceError, run_quiz

router = APIRouter(prefix="/workspaces", tags=["quiz"])


class QuizGenerateRequest(QuizRequest):
    # Optional fallback; the persisted reviewer is preferred when available.
    reviewer: IngestPayload | None = None


@router.post("/{workspace_id}/quiz", response_model=Quiz)
async def generate_quiz(
    workspace_id: str,
    body: QuizGenerateRequest,
    user_id: str = Depends(get_current_user_id),
) -> Quiz:
    record = await get_repository().get_workspace(user_id=user_id, workspace_id=workspace_id)
    reviewer = record.reviewer if record is not None else body.reviewer
    if reviewer is None:
        raise HTTPException(status_code=404, detail="Workspace reviewer not found.")

    anchor_ids = [entry.anchor_id for entry in reviewer.table_of_contents]
    try:
        return await run_quiz(
            reviewer.markdown_content,
            anchor_ids,
            scope=body.scope,
            question_count=body.question_count,
            study_focus=body.study_focus,
        )
    except InferenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
