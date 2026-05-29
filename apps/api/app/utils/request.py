from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request
from starlette.requests import HTTPConnection

from app.core.config import settings


@dataclass(frozen=True, slots=True)
class ClientInfo:
    ip: str | None
    user_agent: str | None


def client_ip(conn: HTTPConnection) -> str | None:
    count = settings.trusted_proxy_count
    if count > 0:
        forwarded = conn.headers.get("x-forwarded-for")
        if forwarded:
            hops = [part.strip() for part in forwarded.split(",") if part.strip()]
            if hops:
                return hops[max(len(hops) - count, 0)]
    return conn.client.host if conn.client else None


def get_client_info(request: Request) -> ClientInfo:
    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 255:
        user_agent = user_agent[:255]
    return ClientInfo(ip=client_ip(request), user_agent=user_agent)
