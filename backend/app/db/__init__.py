"""
Persistence layer.

`get_repository()` returns the Supabase-backed repository when SUPABASE_URL and the
service-role key are configured, otherwise an in-memory repository so the API is
fully runnable (and testable) with zero external credentials.
"""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.db.base import WorkspaceRepository
from app.db.memory import InMemoryRepository


def _is_configured(value: str) -> bool:
    """Truthy and not a placeholder copied from .env.example (which contain '<')."""
    return bool(value) and "<" not in value and "xxxx" not in value


@lru_cache
def get_repository() -> WorkspaceRepository:
    if _is_configured(settings.supabase_url) and _is_configured(settings.supabase_service_role_key):
        # Imported lazily so the supabase client is only constructed when configured.
        from app.db.supabase_repo import SupabaseRepository

        return SupabaseRepository()
    return InMemoryRepository()
