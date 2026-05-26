from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.auth import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.user import UserUpdate
from app.utils.time import utc_now


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)

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
