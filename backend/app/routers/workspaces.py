"""
Workspace read + document + flashcard endpoints (all user-scoped).

  GET    /workspaces                                    -> dashboard grid
  PATCH  /workspaces/{id}                                -> rename a workspace
  DELETE /workspaces/{id}                                -> delete a workspace (cascades)
  GET    /workspaces/{id}/documents                      -> documents in the workspace
  GET    /workspaces/{id}/reviewer[?document_id=...]     -> a document's Master Reviewer
  PATCH  /workspaces/{id}/documents/{document_id}        -> change a document's study mode
  PATCH  /workspaces/{id}/documents/{document_id}/content -> rename / edit what the tutor reads
  DELETE /workspaces/{id}/documents/{document_id}        -> delete a document
  GET    /workspaces/{id}/flashcards                     -> saved flashcards
  POST   /workspaces/{id}/flashcards                     -> save a flashcard (widget spawning)
  POST   /workspaces/{id}/flashcards/generate            -> generate + save a whole deck on demand

Endpoints that operate on a single document accept an optional `document_id`;
when omitted they resolve to the workspace's primary (newest) document, so the
existing single-document frontend keeps working unchanged.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user_id
from app.db import get_repository
from app.schemas.flashcards import FlashcardGenRequest
from app.schemas.ingest import IngestPayload, TocEntry
from app.schemas.simplify import SimplifyRequest, SimplifyResponse
from app.schemas.workspace import (
    DocumentSummary,
    FlashcardCreate,
    FlashcardRecord,
    StudyModeLiteral,
    WorkspaceSummary,
    doc_to_summary,
    to_summary,
)
from app.services.ai_client import InferenceError, run_flashcard_generation, run_simplify

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class DocumentModeUpdate(BaseModel):
    mode: StudyModeLiteral


class WorkspaceRenameRequest(BaseModel):
    title: str


class DocumentContentUpdate(BaseModel):
    title: str | None = None
    markdown_content: str | None = None


# Mirrors the frontend's canvas.ts HEADING_RE — the inverted anchor format
# "# <span id=\"concept_x\">Title</span>" is what both the reader and the
# tutor use to find chapters, so when a student hand-edits the markdown we
# re-derive the table of contents from whatever headings are still present
# rather than trust a now-stale one.
_HEADING_RE = re.compile(r'^(#{1,6})\s*<span id="([^"]+)">(.*?)</span>\s*$', re.MULTILINE)
_TAG_RE = re.compile(r"<[^>]+>")


def _derive_toc(markdown_content: str) -> list[TocEntry]:
    entries: list[TocEntry] = []
    for m in _HEADING_RE.finditer(markdown_content):
        anchor_id = m.group(2)
        title = _TAG_RE.sub("", m.group(3)).strip()
        entries.append(TocEntry(title=title or anchor_id, anchor_id=anchor_id))
    return entries


@router.get("", response_model=list[WorkspaceSummary])
async def list_workspaces(user_id: str = Depends(get_current_user_id)) -> list[WorkspaceSummary]:
    return await get_repository().list_workspaces(user_id=user_id)


@router.patch("/{workspace_id}", response_model=WorkspaceSummary)
async def rename_workspace(
    workspace_id: str,
    body: WorkspaceRenameRequest,
    user_id: str = Depends(get_current_user_id),
) -> WorkspaceSummary:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty.")
    try:
        record = await get_repository().rename_workspace(
            user_id=user_id, workspace_id=workspace_id, title=title
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workspace not found.") from exc
    return to_summary(record)


@router.delete("/{workspace_id}", status_code=204, response_model=None)
async def delete_workspace(
    workspace_id: str, user_id: str = Depends(get_current_user_id)
) -> None:
    try:
        await get_repository().delete_workspace(user_id=user_id, workspace_id=workspace_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workspace not found.") from exc


@router.get("/{workspace_id}/documents", response_model=list[DocumentSummary])
async def list_documents(
    workspace_id: str, user_id: str = Depends(get_current_user_id)
) -> list[DocumentSummary]:
    record = await get_repository().get_workspace(user_id=user_id, workspace_id=workspace_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")
    return [doc_to_summary(d) for d in record.documents]


@router.get("/{workspace_id}/reviewer", response_model=IngestPayload)
async def get_reviewer(
    workspace_id: str,
    document_id: str | None = None,
    user_id: str = Depends(get_current_user_id),
) -> IngestPayload:
    document = await get_repository().get_document(
        user_id=user_id, workspace_id=workspace_id, document_id=document_id
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document.reviewer


@router.patch("/{workspace_id}/documents/{document_id}", response_model=DocumentSummary)
async def update_document_mode(
    workspace_id: str,
    document_id: str,
    body: DocumentModeUpdate,
    user_id: str = Depends(get_current_user_id),
) -> DocumentSummary:
    try:
        document = await get_repository().set_document_mode(
            user_id=user_id, workspace_id=workspace_id, document_id=document_id, mode=body.mode
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Document not found.") from exc
    return doc_to_summary(document)


@router.patch("/{workspace_id}/documents/{document_id}/content", response_model=DocumentSummary)
async def update_document_content(
    workspace_id: str,
    document_id: str,
    body: DocumentContentUpdate,
    user_id: str = Depends(get_current_user_id),
) -> DocumentSummary:
    """Rename a document and/or directly edit the markdown the tutor reads from
    and the student sees in the reader pane. The table of contents is
    re-derived from whatever anchored headings remain in the edited text."""
    repo = get_repository()
    title = body.title.strip() if body.title is not None else None
    if title is not None and not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty.")

    reviewer: IngestPayload | None = None
    if body.markdown_content is not None:
        content = body.markdown_content.strip()
        if not content:
            raise HTTPException(status_code=422, detail="Content cannot be empty.")
        toc = _derive_toc(content)
        if not toc:
            raise HTTPException(
                status_code=422,
                detail=(
                    'No chapter headings found — keep at least one heading in the '
                    '\'# <span id="concept_x">Title</span>\' format.'
                ),
            )
        reviewer = IngestPayload(table_of_contents=toc, markdown_content=content)

    try:
        document = await repo.update_document(
            user_id=user_id,
            workspace_id=workspace_id,
            document_id=document_id,
            title=title,
            reviewer=reviewer,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Document not found.") from exc
    return doc_to_summary(document)


@router.delete("/{workspace_id}/documents/{document_id}", status_code=204, response_model=None)
async def delete_document(
    workspace_id: str,
    document_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    try:
        await get_repository().delete_document(
            user_id=user_id, workspace_id=workspace_id, document_id=document_id
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Document not found.") from exc


@router.get("/{workspace_id}/flashcards", response_model=list[FlashcardRecord])
async def list_flashcards(
    workspace_id: str, user_id: str = Depends(get_current_user_id)
) -> list[FlashcardRecord]:
    return await get_repository().list_flashcards(user_id=user_id, workspace_id=workspace_id)


@router.post("/{workspace_id}/flashcards", response_model=FlashcardRecord, status_code=201)
async def add_flashcard(
    workspace_id: str,
    card: FlashcardCreate,
    user_id: str = Depends(get_current_user_id),
) -> FlashcardRecord:
    try:
        return await get_repository().add_flashcard(
            user_id=user_id, workspace_id=workspace_id, card=card
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Workspace not found.") from exc


@router.post(
    "/{workspace_id}/flashcards/generate", response_model=list[FlashcardRecord], status_code=201
)
async def generate_flashcards(
    workspace_id: str,
    body: FlashcardGenRequest,
    user_id: str = Depends(get_current_user_id),
) -> list[FlashcardRecord]:
    """Generate a full deck for a document on demand — independent of how far the
    student has gotten through the tutor, unlike the incidental widget_trigger cards."""
    repo = get_repository()
    document = await repo.get_document(
        user_id=user_id, workspace_id=workspace_id, document_id=body.document_id
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    anchor_ids = [entry.anchor_id for entry in document.reviewer.table_of_contents]
    try:
        deck = await run_flashcard_generation(
            document.reviewer.markdown_content,
            anchor_ids,
            scope=body.scope,
            count=body.count,
            study_focus=body.study_focus,
        )
    except InferenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    saved: list[FlashcardRecord] = []
    for card in deck.cards:
        saved.append(
            await repo.add_flashcard(
                user_id=user_id,
                workspace_id=workspace_id,
                card=FlashcardCreate(front=card.front, back=card.back, anchor_id=card.anchor_id),
            )
        )
    return saved


@router.post("/{workspace_id}/simplify", response_model=SimplifyResponse)
async def simplify_blocks(
    workspace_id: str,  # noqa: ARG001 - unused; kept for URL-shape consistency with the rest of the API
    body: SimplifyRequest,
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001 - auth gate only, no per-user data touched
) -> SimplifyResponse:
    """Reading-level rewrite (Standard/ELI5 slider) — a real model call, batched
    (many blocks per request) rather than one round trip per paragraph. Doesn't
    read or write any stored workspace data, so no ownership check is needed
    beyond being authenticated at all."""
    if not body.blocks:
        return SimplifyResponse(blocks=[])
    try:
        return await run_simplify(body.blocks, body.level)
    except InferenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
