from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _build_limiter() -> Limiter:
    if settings.redis_url:
        return Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)
    return Limiter(key_func=get_remote_address)


limiter = _build_limiter()
