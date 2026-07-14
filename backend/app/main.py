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

# NOTE ON MIDDLEWARE ORDER (this bit is load-bearing, don't reshuffle):
# Starlette applies middleware in reverse registration order, so whatever is
# added LAST is the OUTERMOST layer. CORSMiddleware must be outermost, and this
# catch-all must sit inside it.
#
# Why: an exception that reaches Starlette's own ServerErrorMiddleware is
# handled OUTSIDE the CORS layer, so the resulting 500 goes back with no
# Access-Control-Allow-Origin header. The browser then reports it as a CORS
# failure and the frontend can't even read the real error — which is exactly
# how a backend 500 masqueraded as "blocked by CORS policy" in production.
# Catching it here, inside CORS, means the error response still passes back out
# through CORSMiddleware and picks up the right headers.
@app.middleware("http")
async def catch_unhandled_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error."})


# Added last => outermost, so it also wraps the handler above.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Belt-and-braces: the middleware above should catch anything from a route,
    # but this still covers exceptions raised outside it.
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
