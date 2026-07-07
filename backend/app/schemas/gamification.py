"""
Pydantic contracts for the gamification economy — player profile (XP, streak,
daily quests) and per-concept mastery. See 06_DatabaseArchitecture.md.

These mirror the frontend's localStorage models (lib/profile.ts, lib/mastery.ts)
so swapping the client from localStorage to these endpoints is a like-for-like
change.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------- Player profile (per user) ----------

class PlayerProfile(BaseModel):
    user_id: str
    xp: int = 0
    streak: int = 0
    last_active: str = ""  # YYYY-MM-DD
    # date -> { questId -> done }
    quests: dict[str, dict[str, bool]] = Field(default_factory=dict)
    updated_at: datetime


class ProfileUpsert(BaseModel):
    """Partial update; omitted fields are left unchanged."""

    xp: Optional[int] = Field(None, ge=0)
    streak: Optional[int] = Field(None, ge=0)
    last_active: Optional[str] = None
    quests: Optional[dict[str, dict[str, bool]]] = None


# ---------- Concept mastery (per user + workspace + concept) ----------

class ConceptMasteryRecord(BaseModel):
    workspace_id: str
    anchor_id: str
    strength: int = Field(0, ge=0, le=100)
    strikes: int = Field(0, ge=0)
    mastered: bool = False
    updated_at: datetime


class ConceptMasteryUpsert(BaseModel):
    strength: Optional[int] = Field(None, ge=0, le=100)
    strikes: Optional[int] = Field(None, ge=0)
    mastered: Optional[bool] = None
