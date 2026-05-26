from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import (
    auth,
    dms,
    messages,
    moderation,
    notifications,
    rooms,
    users,
    ws,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(rooms.router)
api_router.include_router(messages.router)
api_router.include_router(messages.read_router)
api_router.include_router(moderation.router)
api_router.include_router(notifications.router)
api_router.include_router(dms.router)
api_router.include_router(ws.router)
