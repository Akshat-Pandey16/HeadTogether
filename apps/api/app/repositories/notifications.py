from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, update

from app.models.notifications import DeviceToken, Notification
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


class NotificationRepository(AsyncRepository[Notification]):
    model = Notification

    async def list_for_user(
        self,
        user_id: UUID,
        *,
        limit: int,
        offset: int,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int]:
        base = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            base = base.where(Notification.read_at.is_(None))
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.order_by(Notification.created_at.desc()).limit(limit).offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def unread_count(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        return int(await self.session.scalar(stmt) or 0)

    async def mark_all_read(self, user_id: UUID, at: datetime) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=at)
        )
        result = await self.session.execute(stmt)
        return result.rowcount or 0
