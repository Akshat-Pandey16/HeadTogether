from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError
from app.models.message import Message
from app.repositories.message import MessageRepository
from app.repositories.room import RoomMemberRepository
from app.schemas.message import MessageCreate


class MessageService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.messages = MessageRepository(session)
        self.members = RoomMemberRepository(session)

    async def post(self, *, room_id: UUID, sender_id: UUID, payload: MessageCreate) -> Message:
        await self._ensure_member(room_id, sender_id)
        message = Message(room_id=room_id, sender_id=sender_id, body=payload.body)
        await self.messages.add(message)
        await self.session.commit()
        await self.session.refresh(message, attribute_names=["sender"])
        return message

    async def list(
        self,
        *,
        room_id: UUID,
        actor_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Message], int]:
        await self._ensure_member(room_id, actor_id)
        items = await self.messages.list_for_room(room_id, limit=limit, offset=offset)
        total = await self.messages.count_for_room(room_id)
        return items, total

    async def _ensure_member(self, room_id: UUID, user_id: UUID) -> None:
        if not await self.members.is_member(room_id, user_id):
            raise AuthorizationError("Not a member of this room", code="not_member")
