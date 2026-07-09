"""
Pydantic contracts for [MODE: INGEST].

These mirror the frontend's `src/types/prism.ts` (TocEntry / IngestPayload) one-to-one.
`IngestPayload` is also the schema we hand to the model as the required JSON shape, so
the model's output, our validation, and the frontend renderer all agree.
"""

from __future__ import annotations

from enum import Enum
from typing import List

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    pdf = "pdf"
    pptx = "pptx"
    youtube = "youtube"
    website = "website"


class TocEntry(BaseModel):
    title: str = Field(..., description="Human-readable chapter/heading title, e.g. '2. Mitosis Phases'")
    anchor_id: str = Field(
        ...,
        description="Slug matching the <span id> in markdown_content, e.g. 'concept_mitosis'",
    )


class IngestPayload(BaseModel):
    """The Master Reviewer document produced from a single source."""

    table_of_contents: List[TocEntry]
    markdown_content: str = Field(
        ...,
        description=(
            "Markdown study guide. Every heading uses the INVERTED anchor format "
            "'# <span id=\"concept_x\">Title</span>' so react-markdown renders a real "
            "heading with a scroll anchor."
        ),
    )


class ExtractedSource(BaseModel):
    """Raw text pulled from a file/URL before it is sent to the LLM."""

    source_type: SourceType
    title: str
    raw_text: str
    unit_count: int = Field(
        ..., description="Slides (pptx), pages (pdf), transcript minutes (youtube), or ~1000-char blocks (website)"
    )


class IngestResponse(BaseModel):
    workspace_id: str
    document_id: str
    mode: str = "learn"
    source_type: SourceType
    reviewer: IngestPayload
