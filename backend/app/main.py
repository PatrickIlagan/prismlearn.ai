from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import gamification, ingest, quiz, tutor, workspaces

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

app.include_router(ingest.router)
app.include_router(workspaces.router)
app.include_router(tutor.router)
app.include_router(quiz.router)
app.include_router(gamification.router)


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "prismlearning-api"}
