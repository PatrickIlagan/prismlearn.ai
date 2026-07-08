"""Pydantic contracts for [MODE: FLASHCARDS] on-demand deck generation."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class GeneratedFlashcard(BaseModel):
    front: str
    back: str
    anchor_id: Optional[str] = None


class FlashcardDeck(BaseModel):
    cards: List[GeneratedFlashcard]


class FlashcardGenRequest(BaseModel):
    # Which document to generate from; defaults to the workspace's primary document.
    document_id: Optional[str] = None
    # "all" for the whole document, or a specific concept anchor_id.
    scope: str = "all"
    count: int = Field(10, ge=1, le=30)
    study_focus: Literal["technical", "conceptual", "comprehensive"] = "comprehensive"
