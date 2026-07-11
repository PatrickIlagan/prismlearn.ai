from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # AI provider switch — "fireworks" (gpt-oss-120b via Fireworks, default) or
    # "amd_cloud" (Gemma 4, self-hosted via vLLM on AMD Developer Cloud). See
    # app/services/ai_client.py. Swapping this back to "fireworks" fully
    # reverts to the original provider with zero code changes.
    ai_provider: str = "fireworks"

    # Fireworks AI
    fireworks_api_key: str = ""
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"
    fireworks_model: str = ""

    # AMD Developer Cloud (Gemma 4 via a self-hosted vLLM OpenAI-compatible
    # server — AMD Developer Cloud has no managed inference API, so this must
    # point at a VM you've launched and run `vllm serve` on yourself).
    amd_cloud_base_url: str = ""
    amd_cloud_api_key: str = ""
    amd_cloud_model: str = "google/gemma-4-26B-A4B-it"

    # Gemma 4 on Fireworks (on-demand deployment) — used ONLY for optional
    # slide/page image captioning during PPTX ingestion (see
    # app/services/vision.py). Deliberately separate from ai_provider/
    # fireworks_model: this is not part of the always-on pipeline every user
    # hits, since a dedicated GPU deployment doesn't pencil out against a
    # $10/mo subscription at any real scale. Leave unset — the default — and
    # captioning is skipped entirely at zero cost; ingestion is unchanged
    # from before this existed. Only set this while a deployment is actually
    # running (see documentation for the exact deployment command).
    fireworks_gemma_model: str = ""

    # Gemma 3 27B (Google DeepMind) on Fireworks — the TASK-level model tried
    # FIRST for flashcard generation specifically (see run_flashcard_generation
    # in fireworks.py), not a provider-wide switch like ai_provider. Flashcard
    # generation is a short, templated extraction task, unlike the multi-turn
    # scaffolded reasoning the tutor does — a smaller model is a deliberate
    # fit, not a downgrade. run_flashcard_generation calls this model first on
    # every request and automatically falls back to fireworks_model
    # (gpt-oss-120b) if the call fails — a real runtime fallback, not a config
    # flag someone has to flip. As of this writing no Gemma model is served
    # serverless on Fireworks yet (verified directly against the chat
    # completions API — this exact slug still 404s), so every request
    # currently exercises that fallback path; the moment Fireworks lists it
    # (or an on-demand deployment is stood up under this slug), flashcards
    # start running on Gemma with zero code change. Set to "" to skip the
    # Gemma attempt entirely and go straight to gpt-oss-120b.
    gemma_flashcards_model: str = "accounts/fireworks/models/gemma3-27b-it"

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Clerk
    clerk_secret_key: str = ""
    clerk_jwks_url: str = ""

    # YouTube transcript proxy — cloud-provider IPs (Render, AWS, GCP, etc.)
    # are blocked outright by YouTube's transcript endpoint, so this works
    # locally but fails once deployed (see extract_youtube in extractors.py).
    # Webshare is youtube-transcript-api's own recommended fix: it has
    # first-class support (auto retry-on-block) via these two vars alone.
    # A generic HTTP(S) proxy also works if set instead. Leave both unset and
    # requests go direct, unchanged from before this existed.
    youtube_proxy_webshare_username: str = ""
    youtube_proxy_webshare_password: str = ""
    youtube_proxy_url: str = ""

    # App
    frontend_origin: str = "http://localhost:3000"
    max_document_pages: int = 20
    max_youtube_minutes: int = 30
    max_upload_mb: int = 25
    max_website_chars: int = 40000


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
