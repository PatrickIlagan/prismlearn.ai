"""
Request → user_id resolution.

Verifies the Clerk session JWT (sent as `Authorization: Bearer <token>`) against
Clerk's JWKS and returns the `sub` claim as the user id. Falls back to the
`X-User-Id` dev header (then a fixed dev user) when Clerk isn't configured, so
the API stays runnable with zero external credentials — same guard pattern as
`db/get_repository()`.

Once a valid bearer token is present, it is authoritative: `X-User-Id` is never
trusted alongside it, since that would let a caller impersonate a different
user's data.
"""

from __future__ import annotations

from functools import lru_cache

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.core.config import settings

DEV_USER_ID = "dev-user"


def _is_configured(value: str) -> bool:
    """Truthy and not a placeholder copied from .env.example (which contain '<')."""
    return bool(value) and "<" not in value and "xxxx" not in value


@lru_cache
def _jwks_client() -> PyJWKClient:
    # Cached: fetches + caches Clerk's signing keys, refetching only on a
    # kid the cache hasn't seen (e.g. after Clerk rotates keys).
    return PyJWKClient(settings.clerk_jwks_url, cache_keys=True)


def _verify(token: str) -> str:
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk session tokens don't set aud.
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session.") from exc

    # Defense-in-depth: a Clerk session token is valid for every application on
    # the same Clerk instance unless the caller checks azp (authorized party).
    azp = payload.get("azp")
    if azp and azp != settings.frontend_origin:
        raise HTTPException(status_code=401, detail="Token issued for a different origin.")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject.")
    return sub


async def get_current_user_id(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
) -> str:
    clerk_configured = _is_configured(settings.clerk_jwks_url) and _is_configured(
        settings.clerk_secret_key
    )

    if authorization and authorization.startswith("Bearer "):
        if not clerk_configured:
            raise HTTPException(status_code=401, detail="Authentication is not configured.")
        return _verify(authorization.removeprefix("Bearer ").strip())

    # No bearer token: dev/testing fallback (also used while Clerk isn't set up).
    return x_user_id or DEV_USER_ID
