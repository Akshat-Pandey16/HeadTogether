from __future__ import annotations

import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.logging import get_logger

log = get_logger("http")

_SKIP_PATHS = {"/health"}


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            log.exception(
                "http.request.failed",
                method=request.method,
                path=request.url.path,
                duration_ms=round(duration_ms, 1),
                client=request.client.host if request.client else None,
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        status = response.status_code
        level = "info" if status < 400 else "warning" if status < 500 else "error"
        getattr(log, level)(
            "http.request",
            method=request.method,
            path=request.url.path,
            status=status,
            duration_ms=round(duration_ms, 1),
        )
        return response
