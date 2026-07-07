"""
Fireworks AI (Gemma 4) client.

Fireworks is OpenAI-API compatible, so we drive it with the `openai` SDK pointed at
the Fireworks base URL. We request JSON output and validate it against our Pydantic
schema before it ever reaches the frontend — the frontend never sees raw model text.
"""

from __future__ import annotations

import json

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.prompts.ingest import build_ingest_messages
from app.prompts.quiz import build_quiz_messages
from app.prompts.tutor import build_tutor_messages
from app.schemas.ingest import IngestPayload
from app.schemas.quiz import Quiz
from app.schemas.tutor import TutorRequest, TutorResponse


class InferenceError(Exception):
    """Raised when the model call fails or returns unparseable/invalid JSON."""


_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.fireworks_api_key:
            raise InferenceError("FIREWORKS_API_KEY is not configured.")
        _client = AsyncOpenAI(
            api_key=settings.fireworks_api_key,
            base_url=settings.fireworks_base_url,
        )
    return _client


def _extract_json(content: str) -> dict:
    """Best-effort parse: handle clean JSON, or JSON wrapped in ``` fences."""
    text = content.strip()
    if text.startswith("```"):
        # strip ```json ... ``` fences
        text = text.split("```", 2)[1] if text.count("```") >= 2 else text
        text = text.removeprefix("json").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback: grab the outermost {...} span.
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


async def run_ingestion(raw_text: str, study_focus: str = "comprehensive") -> IngestPayload:
    client = get_client()
    messages = build_ingest_messages(raw_text, study_focus)

    try:
        completion = await client.chat.completions.create(
            model=settings.fireworks_model,
            messages=messages,
            temperature=0.3,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed: {exc}") from exc

    content = completion.choices[0].message.content or ""
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc

    try:
        return IngestPayload.model_validate(data)
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the IngestPayload schema: {exc}") from exc


async def run_tutor(
    req: TutorRequest,
    markdown_content: str,
    anchor_ids: list[str],
) -> TutorResponse:
    """Execute one [MODE: TUTOR] turn and return a validated TutorResponse."""
    client = get_client()
    messages = build_tutor_messages(
        req.student_message,
        markdown_content,
        anchor_ids,
        current_step=req.current_step,
        total_steps=req.total_steps,
        strike_count=req.strike_count,
        recent_history=req.recent_history,
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.fireworks_model,
            messages=messages,
            temperature=0.4,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed: {exc}") from exc

    content = completion.choices[0].message.content or ""
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc

    try:
        return TutorResponse.model_validate(data)
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the TutorResponse schema: {exc}") from exc


async def run_quiz(
    markdown_content: str,
    anchor_ids: list[str],
    *,
    scope: str,
    question_count: int,
    study_focus: str,
) -> Quiz:
    """Generate a quiz via [MODE: QUIZ] and return a validated Quiz."""
    client = get_client()
    messages = build_quiz_messages(
        markdown_content,
        anchor_ids,
        scope=scope,
        question_count=question_count,
        study_focus=study_focus,
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.fireworks_model,
            messages=messages,
            temperature=0.5,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed: {exc}") from exc

    content = completion.choices[0].message.content or ""
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc

    try:
        return Quiz.model_validate(data)
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the Quiz schema: {exc}") from exc
