from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.tag import Tag
from app.models.user import User
from app.repositories.auth import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.user import UserUpdate
from app.services.tag import TagService
from app.utils.time import utc_now


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)
        self.tag_service = TagService(session)

    async def update_profile(self, *, user: User, payload: UserUpdate) -> User:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(user, field, value)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def soft_delete(self, *, user: User) -> None:
        user.is_active = False
        await self.refresh_tokens.revoke_all_for_user(user.id, utc_now())
        await self.session.commit()

    async def list_my_tags(self, *, user_id: UUID) -> list[Tag]:
        return await self.tag_service.list_user_tags(user_id)

    async def set_my_tags(self, *, user_id: UUID, labels: list[str]) -> list[Tag]:
        return await self.tag_service.set_user_tags(user_id, labels)

    async def get_public_profile(self, *, user_id: UUID) -> User:
        user = await self.users.get(user_id)
        if user is None or not user.is_active:
            raise NotFoundError("User not found", code="user_not_found")
        return user
