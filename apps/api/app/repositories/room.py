from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.room import Room, RoomDetail, RoomMember
from app.repositories.base import AsyncRepository


class RoomRepository(AsyncRepository[Room]):
    model = Room

    async def get_with_details(self, room_id: UUID) -> Room | None:
        stmt = (
            select(Room)
            .where(Room.id == room_id)
            .options(selectinload(Room.details), selectinload(Room.owner))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active(self) -> list[Room]:
        stmt = select(Room).where(Room.is_active.is_(True))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_member(self, user_id: UUID) -> list[Room]:
        stmt = (
            select(Room)
            .join(RoomMember, RoomMember.room_id == Room.id)
            .where(RoomMember.user_id == user_id)
            .order_by(Room.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class RoomMemberRepository(AsyncRepository[RoomMember]):
    model = RoomMember

    async def list_for_room(self, room_id: UUID) -> list[RoomMember]:
        stmt = (
            select(RoomMember)
            .where(RoomMember.room_id == room_id)
            .options(selectinload(RoomMember.user))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def is_member(self, room_id: UUID, user_id: UUID) -> bool:
        return await self.exists(room_id=room_id, user_id=user_id)


class RoomDetailRepository(AsyncRepository[RoomDetail]):
    model = RoomDetail
