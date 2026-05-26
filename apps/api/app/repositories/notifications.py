from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from app.models.notifications import DeviceToken
from app.repositories.base import AsyncRepository


class DeviceTokenRepository(AsyncRepository[DeviceToken]):
    model = DeviceToken

    async def get_by_token(self, token: str) -> DeviceToken | None:
        return await self.get_by(token=token)

    async def list_for_user(self, user_id: UUID) -> list[DeviceToken]:
        stmt = select(DeviceToken).where(
            DeviceToken.user_id == user_id, DeviceToken.revoked_at.is_(None)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
