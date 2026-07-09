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

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Clerk
    clerk_secret_key: str = ""
    clerk_jwks_url: str = ""

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
