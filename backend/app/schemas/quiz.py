"""
Pydantic contracts for [MODE: QUIZ] (PRD Doc 1 §4).

Mirrors the frontend `prism.ts` Quiz types. Four question varieties: multiple
choice, true/false, fill-in-the-blank, and short-answer/reasoning.
"""

from __future__ import annotations

import uuid
from enum import Enum
from typing import List, Literal, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator


class QuestionType(str, Enum):
    mcq = "mcq"
    true_false = "true_false"
    fill_blank = "fill_blank"
    short_answer = "short_answer"


class QuizQuestion(BaseModel):
    # LLMs (especially reasoning models) drift on key names, so accept the common
    # synonyms for each field and fall back to sane defaults instead of 500ing.
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    type: QuestionType
    prompt: str = Field(validation_alias=AliasChoices("prompt", "question", "text"))
    # Present for mcq (2-4 choices); empty for other types.
    options: List[str] = Field(
        default_factory=list, validation_alias=AliasChoices("options", "choices")
    )
    # The correct answer (option text for mcq, "True"/"False", the missing word,
    # or a model answer for short_answer).
    answer: str = Field(validation_alias=AliasChoices("answer", "correct_answer", "correct"))
    explanation: str = ""
    # Links the question back to a concept anchor for review.
    anchor_id: Optional[str] = None

    @model_validator(mode="after")
    def _check_mcq_options(self) -> "QuizQuestion":
        if self.type == QuestionType.mcq and len(self.options) < 2:
            raise ValueError("mcq questions require at least 2 options")
        return self


class Quiz(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # gpt-oss-120b returns "name" instead of "title"; accept either and default it.
    title: str = Field(
        default="Practice Quiz", validation_alias=AliasChoices("title", "name")
    )
    questions: List[QuizQuestion]


# ---------- Request ----------

class QuizRequest(BaseModel):
    # "all" for the whole document, or a specific concept anchor_id for scoped quizzes.
    scope: str = "all"
    question_count: int = Field(5, ge=1, le=20)
    study_focus: Literal["technical", "conceptual", "comprehensive"] = "comprehensive"
