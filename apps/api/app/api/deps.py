from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.models.user import User
from app.services.auth import AuthService
from app.services.message import MessageService
from app.services.room import RoomService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_v1_prefix}/auth/login",
    auto_error=True,
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


def get_auth_service(session: SessionDep) -> AuthService:
    return AuthService(session)


def get_room_service(session: SessionDep) -> RoomService:
    return RoomService(session)


def get_message_service(session: SessionDep) -> MessageService:
    return MessageService(session)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
RoomServiceDep = Annotated[RoomService, Depends(get_room_service)]
MessageServiceDep = Annotated[MessageService, Depends(get_message_service)]


async def get_current_user(token: TokenDep, auth: AuthServiceDep) -> User:
    return await auth.get_current_user(token)


CurrentUser = Annotated[User, Depends(get_current_user)]
