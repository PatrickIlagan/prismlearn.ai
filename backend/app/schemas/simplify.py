"""
Pydantic contracts for the reading-level rewrite (Standard / ELI5 slider).

Real rewriting requires actually understanding the sentence — a previous
version did blind regex word-substitution client-side ("utilize" -> "use",
etc.), which breaks grammar mid-sentence and reads as mangled rather than
simplified. This is a real model call instead, batched (many blocks, one
request) so dragging the slider isn't one round-trip per paragraph.
"""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel


class SimplifyBlock(BaseModel):
    id: str
    text: str


class SimplifyRequest(BaseModel):
    blocks: List[SimplifyBlock]
    level: Literal["standard", "eli5"]


class SimplifyResponse(BaseModel):
    blocks: List[SimplifyBlock]
