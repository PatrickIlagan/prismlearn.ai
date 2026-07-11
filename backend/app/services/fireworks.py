"""
Fireworks AI (gpt-oss-120b, served on AMD Instinct GPUs) client.

Fireworks is OpenAI-API compatible, so we drive it with the `openai` SDK pointed at
the Fireworks base URL. We request JSON output and validate it against our Pydantic
schema before it ever reaches the frontend — the frontend never sees raw model text.
"""

from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.prompts.flashcards import build_flashcard_messages
from app.prompts.ingest import build_ingest_messages
from app.prompts.quiz import build_quiz_messages
from app.prompts.simplify import build_simplify_messages
from app.prompts.tutor import build_tutor_messages
from app.schemas.flashcards import FlashcardDeck
from app.schemas.ingest import IngestPayload
from app.schemas.quiz import Quiz
from app.schemas.simplify import SimplifyBlock, SimplifyResponse
from app.schemas.tutor import TutorRequest, TutorResponse


logger = logging.getLogger("prismlearning")


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


def _schema_format(model_cls: type[BaseModel]) -> dict:
    """Fireworks' JSON-schema-constrained output mode.

    Plain `{"type": "json_object"}` only asks the model to produce *some*
    valid JSON — on longer/more complex inputs gpt-oss-120b was observed
    drifting into a tool-call-shaped envelope (e.g. `{"name":
    "master_reviewer", ...}`) instead of our flat schema, failing Pydantic
    validation. Passing the actual schema constrains decoding to match it.
    Confirmed fixed against a real failing input before this was wired in.
    """
    return {
        "type": "json_schema",
        "json_schema": {"name": model_cls.__name__, "schema": model_cls.model_json_schema()},
    }


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
            response_format=_schema_format(IngestPayload),
            extra_body={"reasoning_effort": "medium"},
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Fireworks returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (reasoning likely exhausted max_tokens).")
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
        session_mode=req.session_mode,
        text_complexity=req.text_complexity,
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.fireworks_model,
            messages=messages,
            temperature=0.4,
            max_tokens=1536,
            response_format=_schema_format(TutorResponse),
            extra_body={"reasoning_effort": "low"},
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Fireworks returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (reasoning likely exhausted max_tokens).")
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
            # Bumped alongside reasoning_effort: "high" spends more hidden
            # reasoning tokens before the visible JSON, and 2048 was tight
            # enough that it risked the empty-content failure mode (reasoning
            # exhausting the budget before any output) we hit earlier with
            # the tutor endpoint.
            max_tokens=4096,
            response_format=_schema_format(Quiz),
            # "low" caused real arithmetic slips on "math" questions (e.g. a
            # correct step-by-step explanation next to a wrong final `answer`
            # field) — solving an equation/tracing code needs more than "low"
            # gives, unlike picking a plausible MCQ distractor. "medium" still
            # let the final `answer` field drift from the explanation's own
            # correct derivation on multi-value systems; "high" is worth the
            # extra latency here since correctness IS the feature.
            extra_body={"reasoning_effort": "high"},
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Fireworks returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (reasoning likely exhausted max_tokens).")
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc

    try:
        return Quiz.model_validate(data)
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the Quiz schema: {exc}") from exc


async def _call_flashcard_model(client: AsyncOpenAI, model: str, messages: list, extra_body: dict) -> FlashcardDeck:
    completion = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.5,
        max_tokens=2048,
        response_format=_schema_format(FlashcardDeck),
        extra_body=extra_body,
    )
    if not completion.choices:
        raise InferenceError("Fireworks returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (reasoning likely exhausted max_tokens).")
    data = _extract_json(content)  # raises json.JSONDecodeError, caught by the caller
    return FlashcardDeck.model_validate(data)  # raises ValidationError, caught by the caller


async def run_flashcard_generation(
    markdown_content: str,
    anchor_ids: list[str],
    *,
    scope: str,
    count: int,
    study_focus: str,
) -> FlashcardDeck:
    """Generate a flashcard deck via [MODE: FLASHCARDS], independent of tutor progress.

    Gemma 3 27B (Google DeepMind), via Fireworks AI, is the first model tried —
    a short, templated extraction task like this is a deliberately good fit for
    a smaller model, unlike the tutor's multi-turn scaffolded reasoning which
    stays on gpt-oss-120b. If that call fails for any reason (model not yet
    provisioned as an on-demand deployment, transient error, bad output), this
    automatically retries once against gpt-oss-120b before giving up — a real
    fallback that runs every time, not a config flag nobody flips. `reasoning_effort`
    is gpt-oss's own harmony-format field, so it's only sent on the fallback
    attempt; Gemma doesn't use it.
    """
    client = get_client()
    messages = build_flashcard_messages(
        markdown_content,
        anchor_ids,
        scope=scope,
        count=count,
        study_focus=study_focus,
    )

    gemma_model = settings.gemma_flashcards_model
    if gemma_model:
        try:
            return await _call_flashcard_model(client, gemma_model, messages, extra_body={})
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemma flashcard generation failed (%s), falling back to gpt-oss-120b: %s", gemma_model, exc)

    fallback_model = settings.fireworks_model
    try:
        return await _call_flashcard_model(
            client, fallback_model, messages, extra_body={"reasoning_effort": "low"}
        )
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the FlashcardDeck schema: {exc}") from exc
    except InferenceError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed ({fallback_model}): {exc}") from exc


async def run_simplify(blocks: list[SimplifyBlock], level: str) -> SimplifyResponse:
    """Rewrite a batch of blocks at a target reading level (the Standard/ELI5
    slider) — real model call, not the local word-substitution hack this
    replaced (which broke grammar mid-sentence instead of simplifying)."""
    client = get_client()
    messages = build_simplify_messages([b.model_dump() for b in blocks], level)

    try:
        completion = await client.chat.completions.create(
            model=settings.fireworks_model,
            messages=messages,
            temperature=0.4,
            max_tokens=4096,
            response_format=_schema_format(SimplifyResponse),
            extra_body={"reasoning_effort": "low"},
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"Fireworks inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Fireworks returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (reasoning likely exhausted max_tokens).")
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc

    try:
        return SimplifyResponse.model_validate(data)
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the SimplifyResponse schema: {exc}") from exc
