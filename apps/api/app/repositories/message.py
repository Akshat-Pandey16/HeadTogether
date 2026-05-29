from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.orm import selectinload

from app.models.message import Message, MessageReaction, RoomReadState
from app.repositories.base import AsyncRepository


class MessageRepository(AsyncRepository[Message]):
    model = Message

    async def get_visible(self, message_id: UUID) -> Message | None:
        stmt = (
            select(Message)
            .where(Message.id == message_id)
            .options(selectinload(Message.sender), selectinload(Message.reactions))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_idempotency(
        self, room_id: UUID, sender_id: UUID, client_message_id: str
    ) -> Message | None:
        stmt = (
            select(Message)
            .where(
                Message.room_id == room_id,
                Message.sender_id == sender_id,
                Message.client_message_id == client_message_id,
            )
            .options(selectinload(Message.sender), selectinload(Message.reactions))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def page(
        self,
        *,
        room_id: UUID,
        limit: int,
        before_id: UUID | None,
        after_id: UUID | None,
    ) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.room_id == room_id)
            .options(selectinload(Message.sender), selectinload(Message.reactions))
        )
        if before_id is not None:
            anchor = await self.session.get(Message, before_id)
            if anchor is not None:
                stmt = stmt.where(
                    or_(
                        Message.created_at < anchor.created_at,
                        and_(
                            Message.created_at == anchor.created_at,
                            Message.id < anchor.id,
                        ),
                    )
                )
        if after_id is not None:
            anchor = await self.session.get(Message, after_id)
            if anchor is not None:
                stmt = stmt.where(
                    or_(
                        Message.created_at > anchor.created_at,
                        and_(
                            Message.created_at == anchor.created_at,
                            Message.id > anchor.id,
                        ),
                    )
                )
        stmt = stmt.order_by(desc(Message.created_at), desc(Message.id)).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def page_after_asc(
        self,
        *,
        room_id: UUID,
        after_created_at: datetime,
        after_id: UUID,
        limit: int,
    ) -> list[Message]:
        stmt = (
            select(Message)
            .where(
                Message.room_id == room_id,
                or_(
                    Message.created_at > after_created_at,
                    and_(Message.created_at == after_created_at, Message.id > after_id),
                ),
            )
            .options(selectinload(Message.sender), selectinload(Message.reactions))
            .order_by(asc(Message.created_at), asc(Message.id))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search(self, *, room_id: UUID, query: str, limit: int) -> list[Message]:
        like = f"%{query.strip()}%"
        stmt = (
            select(Message)
            .where(
                Message.room_id == room_id,
                Message.deleted_at.is_(None),
                Message.body.ilike(like),
            )
            .options(selectinload(Message.sender), selectinload(Message.reactions))
            .order_by(desc(Message.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_pinned(self, room_id: UUID) -> list[Message]:
        stmt = (
            select(Message)
            .where(
                Message.room_id == room_id,
                Message.pinned_at.is_not(None),
                Message.deleted_at.is_(None),
            )
            .options(selectinload(Message.sender), selectinload(Message.reactions))
            .order_by(desc(Message.pinned_at))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_unread(self, *, room_id: UUID, after_created_at_exclusive) -> int:
        stmt = select(func.count()).select_from(Message).where(Message.room_id == room_id)
        if after_created_at_exclusive is not None:
            stmt = stmt.where(Message.created_at > after_created_at_exclusive)
        return int(await self.session.scalar(stmt) or 0)

    async def count_for_room(self, room_id: UUID) -> int:
        stmt = select(func.count()).select_from(Message).where(Message.room_id == room_id)
        return int(await self.session.scalar(stmt) or 0)


class MessageReactionRepository(AsyncRepository[MessageReaction]):
    model = MessageReaction

    async def get_reaction(
        self, message_id: UUID, user_id: UUID, emoji: str
    ) -> MessageReaction | None:
        stmt = select(MessageReaction).where(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
            MessageReaction.emoji == emoji,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class RoomReadStateRepository(AsyncRepository[RoomReadState]):
    model = RoomReadState

    async def get_for(self, room_id: UUID, user_id: UUID) -> RoomReadState | None:
        stmt = select(RoomReadState).where(
            RoomReadState.room_id == room_id, RoomReadState.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
