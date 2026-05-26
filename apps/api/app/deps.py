from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.models.user import User
from app.services.auth import AuthService
from app.services.dm import DMService
from app.services.message import MessageService
from app.services.moderation import ModerationService
from app.services.notifications import NotificationService
from app.services.password_reset import PasswordResetService
from app.services.room import RoomService
from app.services.user import UserService
from app.utils.request import ClientInfo, get_client_info

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_v1_prefix}/auth/login",
    auto_error=True,
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


def get_auth_service(session: SessionDep) -> AuthService:
    return AuthService(session)


def get_user_service(session: SessionDep) -> UserService:
    return UserService(session)


def get_password_reset_service(session: SessionDep) -> PasswordResetService:
    return PasswordResetService(session)


def get_room_service(session: SessionDep) -> RoomService:
    return RoomService(session)


def get_message_service(session: SessionDep) -> MessageService:
    return MessageService(session)


def get_moderation_service(session: SessionDep) -> ModerationService:
    return ModerationService(session)


def get_notification_service(session: SessionDep) -> NotificationService:
    return NotificationService(session)


def get_dm_service(session: SessionDep) -> DMService:
    return DMService(session)


def get_request_client(request: Request) -> ClientInfo:
    return get_client_info(request)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
PasswordResetServiceDep = Annotated[PasswordResetService, Depends(get_password_reset_service)]
RoomServiceDep = Annotated[RoomService, Depends(get_room_service)]
MessageServiceDep = Annotated[MessageService, Depends(get_message_service)]
ModerationServiceDep = Annotated[ModerationService, Depends(get_moderation_service)]
NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]
DMServiceDep = Annotated[DMService, Depends(get_dm_service)]
ClientInfoDep = Annotated[ClientInfo, Depends(get_request_client)]


async def get_current_user(token: TokenDep, auth: AuthServiceDep) -> User:
    return await auth.get_current_user(token)


CurrentUser = Annotated[User, Depends(get_current_user)]
