from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.message import Message
from app.repositories.base import AsyncRepository


class MessageRepository(AsyncRepository[Message]):
    model = Message

    async def list_for_room(
        self,
        room_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.room_id == room_id)
            .options(selectinload(Message.sender))
            .order_by(Message.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_room(self, room_id: UUID) -> int:
        stmt = select(func.count()).select_from(Message).where(Message.room_id == room_id)
        result = await self.session.execute(stmt)
        return int(result.scalar_one() or 0)
