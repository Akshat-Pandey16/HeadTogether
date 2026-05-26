from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request


@dataclass(frozen=True, slots=True)
class ClientInfo:
    ip: str | None
    user_agent: str | None


def get_client_info(request: Request) -> ClientInfo:
    forwarded = request.headers.get("x-forwarded-for")
    ip: str | None
    if forwarded:
        ip = forwarded.split(",")[0].strip() or None
    else:
        ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    if user_agent and len(user_agent) > 255:
        user_agent = user_agent[:255]
    return ClientInfo(ip=ip, user_agent=user_agent)
