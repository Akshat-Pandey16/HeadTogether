from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.models.enums import RoomPurpose, RoomStatus, RoomVisibility
from app.models.room import Room, RoomDetail, RoomMember
from app.models.user import User
from app.repositories.base import AsyncRepository


class RoomRepository(AsyncRepository[Room]):
    model = Room

    async def get_active(self, room_id: UUID) -> Room | None:
        stmt = select(Room).where(Room.id == room_id, Room.status != RoomStatus.DELETED)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_details(self, room_id: UUID) -> Room | None:
        stmt = (
            select(Room)
            .where(Room.id == room_id, Room.status != RoomStatus.DELETED)
            .options(selectinload(Room.details), selectinload(Room.owner))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_invite_code(self, code: str) -> Room | None:
        stmt = select(Room).where(Room.invite_code == code, Room.status == RoomStatus.ACTIVE)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_owned(
        self, owner_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Room], int]:
        base = select(Room).where(Room.owner_id == owner_id, Room.status != RoomStatus.DELETED)
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(Room.owner))
            .order_by(Room.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def list_for_member(
        self, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Room], int]:
        base = (
            select(Room)
            .join(RoomMember, RoomMember.room_id == Room.id)
            .where(RoomMember.user_id == user_id, Room.status != RoomStatus.DELETED)
        )
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(Room.owner))
            .order_by(Room.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def search_text(self, query: str, *, limit: int, offset: int) -> tuple[list[Room], int]:
        like = f"%{query.strip()}%"
        base = select(Room).where(
            Room.status == RoomStatus.ACTIVE,
            Room.visibility == RoomVisibility.PUBLIC,
            Room.name.ilike(like),
        )
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(Room.owner))
            .order_by(Room.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def candidates_in_bbox(
        self,
        *,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        now: datetime,
        purpose: RoomPurpose | None = None,
    ) -> list[Room]:
        conditions = [
            Room.status == RoomStatus.ACTIVE,
            Room.visibility == RoomVisibility.PUBLIC,
            or_(Room.expires_at.is_(None), Room.expires_at > now),
            Room.latitude.between(lat_min, lat_max),
            Room.longitude.between(lon_min, lon_max),
        ]
        if purpose is not None:
            conditions.append(Room.purpose == purpose)
        stmt = select(Room).where(and_(*conditions)).options(selectinload(Room.owner))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class RoomMemberRepository(AsyncRepository[RoomMember]):
    model = RoomMember

    async def list_for_room(
        self, room_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[RoomMember], int]:
        base = select(RoomMember).where(RoomMember.room_id == room_id)
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(RoomMember.user))
            .join(User, User.id == RoomMember.user_id)
            .order_by(User.first_name)
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def is_member(self, room_id: UUID, user_id: UUID) -> bool:
        return await self.exists(room_id=room_id, user_id=user_id)

    async def get_member(self, room_id: UUID, user_id: UUID) -> RoomMember | None:
        return await self.get_by(room_id=room_id, user_id=user_id)

    async def count_for_room(self, room_id: UUID) -> int:
        stmt = select(func.count()).select_from(RoomMember).where(RoomMember.room_id == room_id)
        return int(await self.session.scalar(stmt) or 0)


class RoomDetailRepository(AsyncRepository[RoomDetail]):
    model = RoomDetail
