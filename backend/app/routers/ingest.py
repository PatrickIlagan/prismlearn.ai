"""
Ingestion endpoint.

POST /ingest/file accepts a multipart file (.pdf/.pptx); POST /ingest/youtube takes
a JSON body with a youtube_url. Each extracts text, runs [MODE: INGEST] on Fireworks,
persists the resulting Master Reviewer, and returns it with its workspace id.

Zero-retention note (PRD Doc 4 §2): the raw upload is only ever held in memory here
and discarded when the request ends — we never write the original file to storage,
only the derived reviewer JSON.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.auth import get_current_user_id
from app.core.config import settings
from app.db import get_repository
from app.schemas.ingest import ExtractedSource, IngestResponse
from app.services import extractors
from app.services.extractors import ExtractionError
from app.services.fireworks import InferenceError, run_ingestion

router = APIRouter(prefix="/ingest", tags=["ingestion"])

_PPTX_CT = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


class YouTubeIngestRequest(BaseModel):
    youtube_url: str
    study_focus: str = "comprehensive"


async def _read_bounded(file: UploadFile) -> bytes:
    """Read an upload while capping memory: reject once it exceeds the byte limit.

    Guards against a huge file being fully buffered before the page/slide check.
    """
    max_bytes = settings.max_upload_mb * 1024 * 1024
    buf = bytearray()
    while chunk := await file.read(1 << 20):  # 1 MiB chunks
        buf.extend(chunk)
        if len(buf) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds the {settings.max_upload_mb} MB upload limit.",
            )
    return bytes(buf)


def _dispatch_file(data: bytes, filename: str, content_type: str | None) -> ExtractedSource:
    name = filename.lower()
    if name.endswith(".pptx") or content_type == _PPTX_CT:
        return extractors.extract_pptx(data, filename)
    if name.endswith(".pdf") or content_type == "application/pdf":
        return extractors.extract_pdf(data, filename)
    raise ExtractionError("Unsupported file type. Upload a .pdf or .pptx.")


async def _ingest_and_store(source: ExtractedSource, study_focus: str, user_id: str) -> IngestResponse:
    try:
        reviewer = await run_ingestion(source.raw_text, study_focus)
    except InferenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = await get_repository().create_workspace(
        user_id=user_id,
        title=source.title,
        source_type=source.source_type,
        reviewer=reviewer,
    )
    return IngestResponse(
        workspace_id=record.id,
        source_type=record.source_type,
        reviewer=record.reviewer,
    )


@router.post("/file", response_model=IngestResponse)
async def ingest_file(
    file: UploadFile = File(...),
    study_focus: str = Form("comprehensive"),
    user_id: str = Depends(get_current_user_id),
) -> IngestResponse:
    data = await _read_bounded(file)
    try:
        source = _dispatch_file(data, file.filename or "upload", file.content_type)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return await _ingest_and_store(source, study_focus, user_id)


@router.post("/youtube", response_model=IngestResponse)
async def ingest_youtube(
    body: YouTubeIngestRequest,
    user_id: str = Depends(get_current_user_id),
) -> IngestResponse:
    try:
        source = extractors.extract_youtube(body.youtube_url)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return await _ingest_and_store(source, body.study_focus, user_id)
