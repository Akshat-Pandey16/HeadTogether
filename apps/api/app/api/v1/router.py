from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import auth, messages, rooms, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(rooms.router)
api_router.include_router(messages.router)
