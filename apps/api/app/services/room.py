from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.models.enums import RoomRole
from app.models.room import Room, RoomDetail, RoomMember
from app.repositories.room import (
    RoomDetailRepository,
    RoomMemberRepository,
    RoomRepository,
)
from app.schemas.room import (
    NearbyRoomRead,
    RoomCreate,
    RoomDetailCreate,
    RoomUpdate,
)
from app.services.geo import haversine_km


class RoomService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rooms = RoomRepository(session)
        self.members = RoomMemberRepository(session)
        self.details = RoomDetailRepository(session)

    async def create(self, *, owner_id: UUID, payload: RoomCreate) -> Room:
        room = Room(
            owner_id=owner_id,
            name=payload.name,
            purpose=payload.purpose,
            latitude=payload.latitude,
            longitude=payload.longitude,
            radius_km=payload.radius_km,
        )
        await self.rooms.add(room)
        await self.members.add(RoomMember(room_id=room.id, user_id=owner_id, role=RoomRole.OWNER))
        await self.session.commit()
        return room

    async def get_or_404(self, room_id: UUID) -> Room:
        room = await self.rooms.get_with_details(room_id)
        if room is None:
            raise NotFoundError("Room not found", code="room_not_found")
        return room

    async def update(self, *, room: Room, actor_id: UUID, payload: RoomUpdate) -> Room:
        self._require_owner(room, actor_id)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(room, field, value)
        await self.session.commit()
        await self.session.refresh(room)
        return room

    async def add_detail(
        self,
        *,
        room: Room,
        actor_id: UUID,
        payload: RoomDetailCreate,
    ) -> RoomDetail:
        self._require_owner(room, actor_id)
        detail = RoomDetail(room_id=room.id, heading=payload.heading, body=payload.body)
        await self.details.add(detail)
        await self.session.commit()
        return detail

    async def join(self, *, room: Room, user_id: UUID) -> RoomMember:
        if await self.members.is_member(room.id, user_id):
            raise ConflictError("Already a member of this room", code="already_member")
        if not room.is_active:
            raise ConflictError("Room is not active", code="room_inactive")
        member = RoomMember(room_id=room.id, user_id=user_id, role=RoomRole.MEMBER)
        await self.members.add(member)
        await self.session.commit()
        return member

    async def list_members(self, *, room_id: UUID, actor_id: UUID) -> list[RoomMember]:
        if not await self.members.is_member(room_id, actor_id):
            raise AuthorizationError("Not a member of this room", code="not_member")
        return await self.members.list_for_room(room_id)

    async def list_joined(self, user_id: UUID) -> list[Room]:
        return await self.rooms.list_for_member(user_id)

    async def search_nearby(
        self,
        *,
        latitude: float,
        longitude: float,
    ) -> list[NearbyRoomRead]:
        active_rooms = await self.rooms.list_active()
        nearby: list[NearbyRoomRead] = []
        for room in active_rooms:
            distance = haversine_km(latitude, longitude, room.latitude, room.longitude)
            if distance <= room.radius_km:
                nearby.append(
                    NearbyRoomRead.model_validate(
                        {**room.__dict__, "distance_km": round(distance, 4)}
                    )
                )
        nearby.sort(key=lambda r: r.distance_km)
        return nearby

    async def ensure_member(self, *, room_id: UUID, user_id: UUID) -> None:
        if not await self.members.is_member(room_id, user_id):
            raise AuthorizationError("Not a member of this room", code="not_member")

    @staticmethod
    def _require_owner(room: Room, actor_id: UUID) -> None:
        if room.owner_id != actor_id:
            raise AuthorizationError(
                "Only the room owner can perform this action", code="not_owner"
            )
