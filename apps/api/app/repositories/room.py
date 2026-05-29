from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.models.enums import MembershipState, RoomPurpose, RoomStatus, RoomVisibility
from app.models.room import Room, RoomDetail, RoomEvent, RoomMember, SavedRoom
from app.models.tag import RoomTag
from app.models.user import User
from app.repositories.base import AsyncRepository


class RoomRepository(AsyncRepository[Room]):
    model = Room

    async def get_active(self, room_id: UUID) -> Room | None:
        stmt = select(Room).where(Room.id == room_id, Room.status != RoomStatus.DELETED)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def lock(self, room_id: UUID) -> Room | None:
        stmt = select(Room).where(Room.id == room_id).with_for_update()
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_any(self, room_id: UUID) -> Room | None:
        return await self.get(room_id)

    async def get_with_details(self, room_id: UUID) -> Room | None:
        stmt = (
            select(Room)
            .where(Room.id == room_id, Room.status != RoomStatus.DELETED)
            .options(
                selectinload(Room.details),
                selectinload(Room.owner),
                selectinload(Room.tags).selectinload(RoomTag.tag),
            )
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
        self,
        user_id: UUID,
        *,
        limit: int,
        offset: int,
        include_archived: bool,
    ) -> tuple[list[Room], int]:
        conditions = [
            RoomMember.user_id == user_id,
            RoomMember.state == MembershipState.ACTIVE,
            Room.status != RoomStatus.DELETED,
        ]
        if not include_archived:
            conditions.append(Room.status == RoomStatus.ACTIVE)
        base = select(Room).join(RoomMember, RoomMember.room_id == Room.id).where(and_(*conditions))
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(Room.owner))
            .order_by(Room.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def list_past_for_member(
        self, user_id: UUID, *, now: datetime, limit: int, offset: int
    ) -> tuple[list[Room], int]:
        base = (
            select(Room)
            .join(RoomMember, RoomMember.room_id == Room.id)
            .where(
                RoomMember.user_id == user_id,
                Room.status != RoomStatus.DELETED,
                or_(
                    Room.ends_at.is_not(None) & (Room.ends_at < now),
                    Room.status == RoomStatus.ARCHIVED,
                ),
            )
        )
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(Room.owner))
            .order_by(Room.ends_at.desc().nulls_last())
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def search_text(
        self,
        *,
        query: str,
        actor_id: UUID,
        purpose: RoomPurpose | None,
        order_by: str,
        limit: int,
        offset: int,
        excluded_user_ids: set[UUID],
    ) -> tuple[list[Room], int]:
        like = f"%{query.strip()}%"
        conditions = [
            Room.status == RoomStatus.ACTIVE,
            Room.visibility == RoomVisibility.PUBLIC,
            Room.name.ilike(like),
        ]
        if purpose is not None:
            conditions.append(Room.purpose == purpose)
        if excluded_user_ids:
            conditions.append(Room.owner_id.notin_(excluded_user_ids))
        base = select(Room).where(and_(*conditions))

        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))

        ordered = base.options(selectinload(Room.owner))
        if order_by == "starts_at":
            ordered = ordered.order_by(Room.starts_at.asc().nulls_last(), Room.created_at.desc())
        else:
            ordered = ordered.order_by(Room.created_at.desc())
        rows = await self.session.execute(ordered.limit(limit).offset(offset))
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
        excluded_user_ids: set[UUID] | None = None,
    ) -> list[Room]:
        conditions = [
            Room.status == RoomStatus.ACTIVE,
            Room.visibility == RoomVisibility.PUBLIC,
            or_(Room.expires_at.is_(None), Room.expires_at > now),
            or_(Room.ends_at.is_(None), Room.ends_at > now),
            Room.latitude.between(lat_min, lat_max),
            Room.longitude.between(lon_min, lon_max),
        ]
        if purpose is not None:
            conditions.append(Room.purpose == purpose)
        if excluded_user_ids:
            conditions.append(Room.owner_id.notin_(excluded_user_ids))
        stmt = select(Room).where(and_(*conditions)).options(selectinload(Room.owner))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class RoomMemberRepository(AsyncRepository[RoomMember]):
    model = RoomMember

    async def list_for_room(
        self, room_id: UUID, *, limit: int, offset: int, state: MembershipState | None
    ) -> tuple[list[RoomMember], int]:
        conditions = [RoomMember.room_id == room_id]
        if state is not None:
            conditions.append(RoomMember.state == state)
        base = select(RoomMember).where(and_(*conditions))
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(RoomMember.user))
            .join(User, User.id == RoomMember.user_id)
            .order_by(User.first_name)
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)

    async def is_active_member(self, room_id: UUID, user_id: UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(RoomMember)
            .where(
                RoomMember.room_id == room_id,
                RoomMember.user_id == user_id,
                RoomMember.state == MembershipState.ACTIVE,
            )
        )
        return (await self.session.scalar(stmt) or 0) > 0

    async def get_member(self, room_id: UUID, user_id: UUID) -> RoomMember | None:
        return await self.get_by(room_id=room_id, user_id=user_id)

    async def count_active(self, room_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(RoomMember)
            .where(
                RoomMember.room_id == room_id,
                RoomMember.state == MembershipState.ACTIVE,
            )
        )
        return int(await self.session.scalar(stmt) or 0)

    async def count_active_for_rooms(self, room_ids: list[UUID]) -> dict[UUID, int]:
        if not room_ids:
            return {}
        stmt = (
            select(RoomMember.room_id, func.count())
            .where(
                RoomMember.room_id.in_(room_ids),
                RoomMember.state == MembershipState.ACTIVE,
            )
            .group_by(RoomMember.room_id)
        )
        result = await self.session.execute(stmt)
        return {room_id: int(count) for room_id, count in result.all()}

    async def memberships_for_user(
        self, user_id: UUID, room_ids: list[UUID]
    ) -> dict[UUID, RoomMember]:
        if not room_ids:
            return {}
        stmt = select(RoomMember).where(
            RoomMember.user_id == user_id, RoomMember.room_id.in_(room_ids)
        )
        result = await self.session.execute(stmt)
        return {m.room_id: m for m in result.scalars().all()}

    async def first_waitlisted(self, room_id: UUID) -> RoomMember | None:
        stmt = (
            select(RoomMember)
            .where(
                RoomMember.room_id == room_id,
                RoomMember.state == MembershipState.WAITLISTED,
            )
            .order_by(RoomMember.created_at.asc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class RoomDetailRepository(AsyncRepository[RoomDetail]):
    model = RoomDetail


class SavedRoomRepository(AsyncRepository[SavedRoom]):
    model = SavedRoom

    async def saved_ids(self, user_id: UUID, room_ids: list[UUID]) -> set[UUID]:
        if not room_ids:
            return set()
        stmt = select(SavedRoom.room_id).where(
            SavedRoom.user_id == user_id, SavedRoom.room_id.in_(room_ids)
        )
        result = await self.session.execute(stmt)
        return {row[0] for row in result.all()}

    async def list_for_user(
        self, user_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[Room], int]:
        base = (
            select(Room)
            .join(SavedRoom, SavedRoom.room_id == Room.id)
            .where(SavedRoom.user_id == user_id, Room.status != RoomStatus.DELETED)
        )
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.options(selectinload(Room.owner))
            .order_by(SavedRoom.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)


class RoomEventRepository(AsyncRepository[RoomEvent]):
    model = RoomEvent

    async def list_for_room(
        self, room_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[RoomEvent], int]:
        base = select(RoomEvent).where(RoomEvent.room_id == room_id)
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.order_by(RoomEvent.created_at.desc()).limit(limit).offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)
