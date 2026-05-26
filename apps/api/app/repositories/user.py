from __future__ import annotations

from app.models.user import User
from app.repositories.base import AsyncRepository


class UserRepository(AsyncRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        return await self.get_by(email=email.lower().strip())
