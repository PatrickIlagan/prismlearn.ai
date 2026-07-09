import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers import gamification, ingest, quiz, tutor, workspaces

logger = logging.getLogger("prismlearning")

app = FastAPI(
    title="PrismLearning.AI API",
    description="Ingestion, agentic tutoring, and assessment engine for PrismLearning.AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Last-resort catch: any exception a router/service didn't already turn into an
    # HTTPException (e.g. a Supabase outage, an unexpected Fireworks SDK error) lands
    # here instead of leaking a raw Starlette traceback to the client.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


app.include_router(ingest.router)
app.include_router(workspaces.router)
app.include_router(tutor.router)
app.include_router(quiz.router)
app.include_router(gamification.router)


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "prismlearning-api"}
