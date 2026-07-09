"""
Gemma 4 client — self-hosted via vLLM's OpenAI-compatible server, running on an
AMD Developer Cloud GPU instance.

Selected by setting AI_PROVIDER=amd_cloud (see app/services/ai_client.py, the
single dispatcher routers actually import from). This module is a parallel,
independent implementation of the same four generation functions as
fireworks.py — it does not import from or modify that file, so the Fireworks
path keeps working unchanged regardless of whether AMD Developer Cloud credits
ever materialize.

Model: Gemma 4 26B-A4B-IT (MoE, 25.2B total / 3.8B active params) — picked over
the 31B dense variant for lower per-token latency (only 3.8B params active per
forward pass) at comparable instruction-following quality, and over the
smaller E4B/E2B variants for meaningfully stronger reasoning. Fits a single
MI300X (192GB) at TP=1 with full context. See
documentation/07_AMDGemmaDeployment.md for how to actually stand up the vLLM
server this points at.

UNVERIFIED — no AMD Developer Cloud access existed when this was written, so
none of this has run against a live endpoint yet. Two things specifically to
confirm on first real use (both called out in vLLM's docs as inconsistent
across versions/models):
  1. `response_format={"type": "json_object"}` support — vLLM's newer docs
     foreground `guided_json`/`structured_outputs` over plain json_object
     mode. If json_object mode errors or returns non-JSON, switch to passing
     an explicit schema via `extra_body={"structured_outputs": {"json": schema}}`
     (schema = the Pydantic model's `.model_json_schema()`). Elevated from
     "maybe" to "probably" by a confirmed failure on the Fireworks side:
     gpt-oss-120b under plain json_object mode was observed drifting into a
     tool-call-shaped envelope on a long/complex input instead of the flat
     schema, failing validation — switching fireworks.py to Fireworks' own
     `{"type": "json_schema", "json_schema": {...}}` fixed it outright
     against the same failing input. Same failure class, different vendor —
     worth trying the schema-constrained path here first, not as a fallback.
  2. `enable_thinking: False` does not reliably suppress Gemma 4's hidden
     reasoning channel the way gpt-oss's reasoning_effort does (Google's own
     docs note larger variants can still emit an empty/ghost thinking block).
     The empty-content guard below is the safety net for that; if truncation
     shows up in practice, pass `--reasoning-parser gemma4` when launching
     `vllm serve` so leaked reasoning tokens land in a separate
     `reasoning_content` field instead of eating `max_tokens`.
"""

from __future__ import annotations

import json

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.core.config import settings
from app.prompts.flashcards import build_flashcard_messages
from app.prompts.ingest import build_ingest_messages
from app.prompts.quiz import build_quiz_messages
from app.prompts.tutor import build_tutor_messages
from app.schemas.flashcards import FlashcardDeck
from app.schemas.ingest import IngestPayload
from app.schemas.quiz import Quiz
from app.schemas.tutor import TutorRequest, TutorResponse
from app.services.fireworks import InferenceError  # shared exception type

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.amd_cloud_base_url:
            raise InferenceError("AMD_CLOUD_BASE_URL is not configured.")
        _client = AsyncOpenAI(
            # vLLM's OpenAI server doesn't require a real key unless launched
            # with --api-key; "EMPTY" is the documented vLLM convention for
            # "no auth configured" (the SDK still requires a non-empty string).
            api_key=settings.amd_cloud_api_key or "EMPTY",
            base_url=settings.amd_cloud_base_url,
        )
    return _client


def _extract_json(content: str) -> dict:
    """Best-effort parse: handle clean JSON, or JSON wrapped in ``` fences."""
    text = content.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if text.count("```") >= 2 else text
        text = text.removeprefix("json").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


def _thinking(enabled: bool) -> dict:
    """Gemma 4's reasoning toggle — a chat-template kwarg, not a sampling
    param like gpt-oss's reasoning_effort. See module docstring caveat #2."""
    return {"chat_template_kwargs": {"enable_thinking": enabled}}


async def run_ingestion(raw_text: str, study_focus: str = "comprehensive") -> IngestPayload:
    client = get_client()
    messages = build_ingest_messages(raw_text, study_focus)

    try:
        completion = await client.chat.completions.create(
            model=settings.amd_cloud_model,
            messages=messages,
            temperature=0.3,
            max_tokens=4096,
            response_format={"type": "json_object"},
            extra_body=_thinking(True),  # deeper structuring over a full document
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"AMD Developer Cloud (Gemma 4) inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Gemma 4 returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (thinking likely exhausted max_tokens).")
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
            model=settings.amd_cloud_model,
            messages=messages,
            temperature=0.4,
            max_tokens=1536,
            response_format={"type": "json_object"},
            extra_body=_thinking(False),  # fast turn-taking
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"AMD Developer Cloud (Gemma 4) inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Gemma 4 returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (thinking likely exhausted max_tokens).")
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
            model=settings.amd_cloud_model,
            messages=messages,
            temperature=0.5,
            max_tokens=2048,
            response_format={"type": "json_object"},
            extra_body=_thinking(False),
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"AMD Developer Cloud (Gemma 4) inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Gemma 4 returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (thinking likely exhausted max_tokens).")
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc

    try:
        return Quiz.model_validate(data)
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the Quiz schema: {exc}") from exc


async def run_flashcard_generation(
    markdown_content: str,
    anchor_ids: list[str],
    *,
    scope: str,
    count: int,
    study_focus: str,
) -> FlashcardDeck:
    """Generate a flashcard deck via [MODE: FLASHCARDS], independent of tutor progress."""
    client = get_client()
    messages = build_flashcard_messages(
        markdown_content,
        anchor_ids,
        scope=scope,
        count=count,
        study_focus=study_focus,
    )

    try:
        completion = await client.chat.completions.create(
            model=settings.amd_cloud_model,
            messages=messages,
            temperature=0.5,
            max_tokens=2048,
            response_format={"type": "json_object"},
            extra_body=_thinking(False),
        )
    except Exception as exc:  # noqa: BLE001
        raise InferenceError(f"AMD Developer Cloud (Gemma 4) inference failed: {exc}") from exc

    if not completion.choices:
        raise InferenceError("Gemma 4 returned no choices (likely filtered or truncated).")
    content = completion.choices[0].message.content or ""
    if not content.strip():
        raise InferenceError("Model returned an empty response (thinking likely exhausted max_tokens).")
    try:
        data = _extract_json(content)
    except json.JSONDecodeError as exc:
        raise InferenceError(f"Model did not return valid JSON: {exc}") from exc

    try:
        return FlashcardDeck.model_validate(data)
    except ValidationError as exc:
        raise InferenceError(f"Model JSON did not match the FlashcardDeck schema: {exc}") from exc
