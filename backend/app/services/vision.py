"""
Optional slide/page image captioning via Gemma 4 (multimodal), deployed
on-demand on Fireworks.

Gated entirely behind FIREWORKS_GEMMA_MODEL. When it's unset (the default),
`caption_images()` returns immediately without making any API call, so
PPTX ingestion behaves exactly as it did before this module existed — this
is deliberately NOT part of the always-on pipeline every user hits.
gpt-oss-120b (serverless, pay-per-token) is what has to actually support a
$10/mo subscription at scale; a dedicated on-demand GPU deployment does not,
so this only runs while someone has explicitly turned it on (e.g. for a
demo), never by default.

Best-effort by design: captioning failures are logged and skipped, never
raised — a Gemma hiccup must never break ingestion itself.
"""

from __future__ import annotations

import base64
import logging

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

_MAX_IMAGES = 8  # cap cost/latency per ingestion regardless of deck size

_CAPTION_PROMPT = (
    "This image is from a study slide. In 1-3 sentences, describe what it "
    "shows for a student's study guide — the process, relationship, or "
    "structure depicted in a diagram or chart. If it's purely decorative "
    "(a logo, background texture, or a photo with no informational "
    "content), reply with exactly: SKIP"
)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.fireworks_api_key, base_url=settings.fireworks_base_url)
    return _client


def captions_enabled() -> bool:
    return bool(settings.fireworks_gemma_model)


def caption_images(images: list[bytes]) -> list[str | None]:
    """One caption per input image, same order, same length as `images`.
    None means "no caption" — either captioning is disabled, this specific
    image was judged decorative, it was past the per-ingestion cap, or the
    call failed. Never raises."""
    if not images:
        return []
    if not captions_enabled():
        return [None] * len(images)

    client = _get_client()
    captions: list[str | None] = []
    for data in images[:_MAX_IMAGES]:
        try:
            b64 = base64.b64encode(data).decode("ascii")
            resp = client.chat.completions.create(
                model=settings.fireworks_gemma_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": _CAPTION_PROMPT},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{b64}"},
                            },
                        ],
                    }
                ],
                max_tokens=150,
                temperature=0.3,
            )
            text = (resp.choices[0].message.content or "").strip()
            captions.append(None if not text or text.upper() == "SKIP" else text)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Gemma image captioning failed, skipping this image: %s", exc)
            captions.append(None)

    # Anything past the cap gets no caption, not an error.
    captions.extend([None] * (len(images) - len(captions)))
    return captions
