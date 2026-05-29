from __future__ import annotations

from slowapi import Limiter
from starlette.requests import Request

from app.core.config import settings
from app.utils.request import client_ip


def _rate_limit_key(request: Request) -> str:
    return client_ip(request) or "anonymous"


def _build_limiter() -> Limiter:
    if settings.redis_url:
        return Limiter(key_func=_rate_limit_key, storage_uri=settings.redis_url)
    return Limiter(key_func=_rate_limit_key)


limiter = _build_limiter()
