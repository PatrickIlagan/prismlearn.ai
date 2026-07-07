"""
Request → user_id resolution.

TEMPORARY: until Clerk JWT verification is wired, we read the caller id from an
`X-User-Id` header and fall back to a dev user. This keeps every downstream call
correctly user-scoped so swapping in real Clerk verification later is a drop-in
change to this one dependency (verify the Bearer JWT against CLERK_JWKS_URL and
return the `sub` claim).
"""

from __future__ import annotations

from fastapi import Header

DEV_USER_ID = "dev-user"


async def get_current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    return x_user_id or DEV_USER_ID
