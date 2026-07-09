"""
Single entry point routers call for AI generation.

Dispatches to whichever provider AI_PROVIDER selects — "fireworks" (default,
gpt-oss-120b via Fireworks AI) or "amd_cloud" (Gemma 4, self-hosted via vLLM
on AMD Developer Cloud) — via app.core.config.settings. Neither provider
module (fireworks.py, gemma_amd.py) imports from or knows about the other;
this is the only place that picks between them, so switching providers is a
one-line env var change with no code edits, in either direction.
"""

from __future__ import annotations

from app.core.config import settings
from app.schemas.flashcards import FlashcardDeck
from app.schemas.ingest import IngestPayload
from app.schemas.quiz import Quiz
from app.schemas.tutor import TutorRequest, TutorResponse
from app.services import fireworks, gemma_amd

InferenceError = fireworks.InferenceError


def _provider():
    return gemma_amd if settings.ai_provider == "amd_cloud" else fireworks


async def run_ingestion(raw_text: str, study_focus: str = "comprehensive") -> IngestPayload:
    return await _provider().run_ingestion(raw_text, study_focus)


async def run_tutor(
    req: TutorRequest,
    markdown_content: str,
    anchor_ids: list[str],
) -> TutorResponse:
    return await _provider().run_tutor(req, markdown_content, anchor_ids)


async def run_quiz(
    markdown_content: str,
    anchor_ids: list[str],
    *,
    scope: str,
    question_count: int,
    study_focus: str,
) -> Quiz:
    return await _provider().run_quiz(
        markdown_content,
        anchor_ids,
        scope=scope,
        question_count=question_count,
        study_focus=study_focus,
    )


async def run_flashcard_generation(
    markdown_content: str,
    anchor_ids: list[str],
    *,
    scope: str,
    count: int,
    study_focus: str,
) -> FlashcardDeck:
    return await _provider().run_flashcard_generation(
        markdown_content,
        anchor_ids,
        scope=scope,
        count=count,
        study_focus=study_focus,
    )
