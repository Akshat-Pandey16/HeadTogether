from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.models.enums import (
    MembershipState,
    RoomPurpose,
    RoomRole,
    RoomStatus,
    RoomVisibility,
)
from app.models.room import Room, RoomMember
from app.repositories.moderation import BlockRepository
from app.repositories.room import RoomMemberRepository, RoomRepository
from app.repositories.user import UserRepository


def _dm_key(a: UUID, b: UUID) -> str:
    first, second = sorted((str(a), str(b)))
    return f"{first}:{second}"


class DMService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rooms = RoomRepository(session)
        self.members = RoomMemberRepository(session)
        self.users = UserRepository(session)
        self.blocks = BlockRepository(session)

    async def create_or_get(self, *, actor_id: UUID, recipient_id: UUID) -> Room:
        if actor_id == recipient_id:
            raise ConflictError("Cannot DM yourself", code="cannot_dm_self")
        recipient = await self.users.get(recipient_id)
        if recipient is None or not recipient.is_active:
            raise NotFoundError("User not found", code="user_not_found")
        if await self.blocks.is_blocked(actor_id=actor_id, target_id=recipient_id):
            raise AuthorizationError("Cannot message this user", code="blocked")
        if not await self._shared_a_public_room(actor_id, recipient_id):
            raise AuthorizationError(
                "You can DM users who you've shared a room with",
                code="must_share_room",
            )

        existing = await self._find_dm(actor_id, recipient_id)
        if existing is not None:
            return existing
        room = Room(
            owner_id=actor_id,
            name="DM",
            purpose=RoomPurpose.CHAT,
            latitude=0.0,
            longitude=0.0,
            radius_km=1.0,
            max_members=2,
            visibility=RoomVisibility.DM,
            status=RoomStatus.ACTIVE,
            dm_key=_dm_key(actor_id, recipient_id),
        )
        try:
            await self.rooms.add(room)
            for uid in (actor_id, recipient_id):
                await self.members.add(
                    RoomMember(
                        room_id=room.id,
                        user_id=uid,
                        role=RoomRole.MEMBER,
                        state=MembershipState.ACTIVE,
                    )
                )
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raced = await self._find_dm(actor_id, recipient_id)
            if raced is not None:
                return raced
            raise
        return room

    async def list_for_user(self, *, user_id: UUID) -> list[Room]:
        stmt = (
            select(Room)
            .join(RoomMember, RoomMember.room_id == Room.id)
            .where(
                RoomMember.user_id == user_id,
                Room.visibility == RoomVisibility.DM,
                Room.status == RoomStatus.ACTIVE,
            )
            .options(selectinload(Room.members).selectinload(RoomMember.user))
            .order_by(Room.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def _shared_a_public_room(self, a: UUID, b: UUID) -> bool:
        ma = RoomMember.__table__.alias("ma")
        mb = RoomMember.__table__.alias("mb")
        stmt = (
            select(func.count())
            .select_from(ma.join(mb, ma.c.room_id == mb.c.room_id))
            .join(Room, Room.id == ma.c.room_id)
            .where(
                and_(
                    ma.c.user_id == a,
                    mb.c.user_id == b,
                    ma.c.state == MembershipState.ACTIVE,
                    mb.c.state == MembershipState.ACTIVE,
                    Room.visibility != RoomVisibility.DM,
                )
            )
        )
        return int(await self.session.scalar(stmt) or 0) > 0

    async def _find_dm(self, a: UUID, b: UUID) -> Room | None:
        stmt = (
            select(Room)
            .where(
                Room.dm_key == _dm_key(a, b),
                Room.status == RoomStatus.ACTIVE,
            )
            .options(selectinload(Room.owner))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
