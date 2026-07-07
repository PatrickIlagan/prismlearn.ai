"""
Pydantic contracts for [MODE: TUTOR].

Mirrors the frontend's `src/types/prism.ts` (TutorResponse and friends) exactly, so
Gemma's JSON, our validation, and the Zustand `applyTutorResponse` reducer all agree.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class UiCommand(str, Enum):
    scroll_and_highlight = "scroll_and_highlight"
    highlight = "highlight"
    none = "none"


class WidgetTrigger(str, Enum):
    none = "none"
    flashcard = "flashcard"


class ChatRole(str, Enum):
    student = "student"
    lumi = "lumi"


class ChatTurn(BaseModel):
    role: ChatRole
    text: str


# ---------- Response (model output) ----------

class TutorEvaluation(BaseModel):
    is_correct: Optional[bool] = Field(
        None, description="true/false when there was an answer to grade; null for greetings/small talk"
    )
    strike_count: int = Field(0, ge=0)
    move_to_end_of_queue: bool = False


class UiAction(BaseModel):
    command: UiCommand = UiCommand.none
    target_anchor_id: Optional[str] = None


class TutorStateUpdate(BaseModel):
    current_step: int = Field(0, ge=0)
    total_steps: int = Field(0, ge=0)
    step_title: str = ""


class TutorResponse(BaseModel):
    internal_thought_process: str = ""
    evaluation: TutorEvaluation
    ui_action: UiAction
    state_update: TutorStateUpdate
    widget_trigger: WidgetTrigger = WidgetTrigger.none
    tutor_message: str


# ---------- Request (from the frontend) ----------

class TutorRequest(BaseModel):
    student_message: str
    # Progress carried by the client so the stateless endpoint can reason about it.
    current_step: int = 0
    total_steps: int = 0
    strike_count: int = 0
    study_focus: Literal["technical", "conceptual", "comprehensive"] = "comprehensive"
    # Trimmed history — PRD Doc 1 §3 prioritizes source material over long histories.
    recent_history: List[ChatTurn] = Field(default_factory=list)
