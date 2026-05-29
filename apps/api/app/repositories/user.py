from __future__ import annotations

from collections.abc import Iterable
from uuid import UUID

from sqlalchemy import select

from app.models.user import User
from app.repositories.base import AsyncRepository


class UserRepository(AsyncRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        return await self.get_by(email=email.lower().strip())

    async def list_by_ids(self, ids: Iterable[UUID]) -> list[User]:
        id_list = list(ids)
        if not id_list:
            return []
        stmt = select(User).where(User.id.in_(id_list))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
