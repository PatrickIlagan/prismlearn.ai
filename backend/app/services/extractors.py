"""
Text extraction for the three supported source formats.

Each extractor enforces the PRD hard limits (Doc 1 §1) and returns a normalized
ExtractedSource. Extraction is deliberately dumb — it only pulls text; structuring
into chapters is the LLM's job in [MODE: INGEST].
"""

from __future__ import annotations

import io
import re
from urllib.parse import parse_qs, urlparse

import pdfplumber
from pptx import Presentation

from app.core.config import settings
from app.schemas.ingest import ExtractedSource, SourceType


class ExtractionError(Exception):
    """Raised for unprocessable sources (too long, unreadable, no text)."""


# --------------------------------------------------------------------------- #
# PPTX
# --------------------------------------------------------------------------- #
def extract_pptx(data: bytes, filename: str) -> ExtractedSource:
    try:
        prs = Presentation(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001 - surface a clean 4xx to the client
        raise ExtractionError(f"Could not open the presentation: {exc}") from exc

    slides = prs.slides
    if len(slides) > settings.max_document_pages:
        raise ExtractionError(
            f"Presentation has {len(slides)} slides; the limit is {settings.max_document_pages}."
        )

    chunks: list[str] = []
    for idx, slide in enumerate(slides, start=1):
        lines = [
            shape.text.strip()
            for shape in slide.shapes
            if shape.has_text_frame and shape.text.strip()
        ]
        if lines:
            chunks.append(f"[Slide {idx}]\n" + "\n".join(lines))

    text = "\n\n".join(chunks).strip()
    if not text:
        raise ExtractionError("No extractable text found in the presentation.")

    return ExtractedSource(
        source_type=SourceType.pptx,
        title=_clean_title(filename),
        raw_text=text,
        unit_count=len(slides),
    )


# --------------------------------------------------------------------------- #
# PDF
# --------------------------------------------------------------------------- #
def extract_pdf(data: bytes, filename: str) -> ExtractedSource:
    try:
        pdf = pdfplumber.open(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise ExtractionError(f"Could not open the PDF: {exc}") from exc

    with pdf:
        if len(pdf.pages) > settings.max_document_pages:
            raise ExtractionError(
                f"PDF has {len(pdf.pages)} pages; the limit is {settings.max_document_pages}."
            )
        chunks: list[str] = []
        for idx, page in enumerate(pdf.pages, start=1):
            page_text = (page.extract_text() or "").strip()
            if page_text:
                chunks.append(f"[Page {idx}]\n{page_text}")
        page_count = len(pdf.pages)

    text = "\n\n".join(chunks).strip()
    if not text:
        raise ExtractionError(
            "No selectable text found in the PDF (it may be a scanned image requiring OCR)."
        )

    return ExtractedSource(
        source_type=SourceType.pdf,
        title=_clean_title(filename),
        raw_text=text,
        unit_count=page_count,
    )


# --------------------------------------------------------------------------- #
# YouTube
# --------------------------------------------------------------------------- #
def extract_youtube(url: str) -> ExtractedSource:
    # youtube-transcript-api v1.x is instance-based (.fetch), not the old
    # classmethod .get_transcript. Imported lazily to keep import cost off startup.
    from youtube_transcript_api import (
        YouTubeTranscriptApi,
        NoTranscriptFound,
        TranscriptsDisabled,
        VideoUnavailable,
    )

    video_id = _parse_youtube_id(url)
    if not video_id:
        raise ExtractionError("Could not parse a YouTube video ID from that URL.")

    try:
        fetched = YouTubeTranscriptApi().fetch(video_id)
        segments = fetched.to_raw_data()  # -> [{"text", "start", "duration"}, ...]
    except (TranscriptsDisabled, NoTranscriptFound):
        raise ExtractionError("This video has no available transcript/captions.")
    except VideoUnavailable:
        raise ExtractionError("This video is unavailable.")
    except Exception as exc:  # noqa: BLE001
        raise ExtractionError(f"Failed to fetch transcript: {exc}") from exc

    if not segments:
        raise ExtractionError("The transcript for this video is empty.")

    # Duration = start of last segment + its duration.
    last = segments[-1]
    total_seconds = float(last.get("start", 0)) + float(last.get("duration", 0))
    minutes = total_seconds / 60.0
    if minutes > settings.max_youtube_minutes:
        raise ExtractionError(
            f"Video is ~{minutes:.0f} min long; the limit is {settings.max_youtube_minutes} min."
        )

    text = " ".join(seg["text"].strip() for seg in segments if seg.get("text", "").strip())
    return ExtractedSource(
        source_type=SourceType.youtube,
        title=f"YouTube video {video_id}",
        raw_text=text,
        unit_count=max(1, round(minutes)),
    )


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _parse_youtube_id(url: str) -> str | None:
    parsed = urlparse(url.strip())
    host = (parsed.hostname or "").lower().removeprefix("www.")
    if host == "youtu.be":
        return parsed.path.lstrip("/") or None
    if host in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        for prefix in ("/embed/", "/shorts/", "/v/"):
            if parsed.path.startswith(prefix):
                return parsed.path[len(prefix):].split("/")[0] or None
    # Bare 11-char id fallback.
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url.strip()):
        return url.strip()
    return None


def _clean_title(filename: str) -> str:
    stem = re.sub(r"\.(pdf|pptx)$", "", filename, flags=re.IGNORECASE)
    stem = re.sub(r"[_-]+", " ", stem).strip()
    return stem or "Untitled"
