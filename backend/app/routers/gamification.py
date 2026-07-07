"""
Gamification endpoints — the persistent player profile (XP, streak, daily quests)
and per-concept mastery. All user-scoped.

  GET /profile                                  -> player profile (created if absent)
  PATCH /profile                                -> partial update
  GET  /workspaces/{id}/mastery                 -> concept mastery for a workspace
  PUT  /workspaces/{id}/mastery/{anchor_id}     -> upsert one concept's mastery
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user_id
from app.db import get_repository
from app.schemas.gamification import (
    ConceptMasteryRecord,
    ConceptMasteryUpsert,
    PlayerProfile,
    ProfileUpsert,
)

router = APIRouter(tags=["gamification"])


@router.get("/profile", response_model=PlayerProfile)
async def get_profile(user_id: str = Depends(get_current_user_id)) -> PlayerProfile:
    return await get_repository().get_profile(user_id=user_id)


@router.patch("/profile", response_model=PlayerProfile)
async def update_profile(
    patch: ProfileUpsert, user_id: str = Depends(get_current_user_id)
) -> PlayerProfile:
    return await get_repository().upsert_profile(user_id=user_id, patch=patch)


@router.get("/workspaces/{workspace_id}/mastery", response_model=list[ConceptMasteryRecord])
async def list_mastery(
    workspace_id: str, user_id: str = Depends(get_current_user_id)
) -> list[ConceptMasteryRecord]:
    return await get_repository().list_mastery(user_id=user_id, workspace_id=workspace_id)


@router.put(
    "/workspaces/{workspace_id}/mastery/{anchor_id}", response_model=ConceptMasteryRecord
)
async def upsert_mastery(
    workspace_id: str,
    anchor_id: str,
    patch: ConceptMasteryUpsert,
    user_id: str = Depends(get_current_user_id),
) -> ConceptMasteryRecord:
    try:
        return await get_repository().upsert_mastery(
            user_id=user_id, workspace_id=workspace_id, anchor_id=anchor_id, patch=patch
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workspace not found.") from exc
