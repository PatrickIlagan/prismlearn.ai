from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Fireworks AI
    fireworks_api_key: str = ""
    fireworks_base_url: str = "https://api.fireworks.ai/inference/v1"
    fireworks_model: str = ""

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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
