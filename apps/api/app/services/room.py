from __future__ import annotations

import secrets
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AuthorizationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.models.enums import RoomRole, RoomStatus, RoomVisibility
from app.models.room import Room, RoomDetail, RoomMember
from app.repositories.room import (
    RoomDetailRepository,
    RoomMemberRepository,
    RoomRepository,
)
from app.schemas.common import Page
from app.schemas.room import (
    JoinRoomRequest,
    NearbyRoom,
    NearbySort,
    RoomCreate,
    RoomDetailCreate,
    RoomDetailed,
    RoomDetailUpdate,
    RoomSummary,
    RoomUpdate,
)
from app.schemas.user import UserPublic
from app.services.geo import bounding_box, haversine_km
from app.utils.time import ensure_utc, utc_now

_INVITE_CODE_BYTES = 9
_MAX_NEARBY_LIMIT = 100


class RoomService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rooms = RoomRepository(session)
        self.members = RoomMemberRepository(session)
        self.details = RoomDetailRepository(session)

    async def create(self, *, owner_id: UUID, payload: RoomCreate) -> Room:
        invite_code = (
            await self._generate_invite_code()
            if payload.visibility == RoomVisibility.PRIVATE
            else None
        )
        room = Room(
            owner_id=owner_id,
            name=payload.name,
            purpose=payload.purpose,
            latitude=payload.latitude,
            longitude=payload.longitude,
            radius_km=payload.radius_km,
            custom_purpose=payload.custom_purpose,
            max_members=payload.max_members,
            visibility=payload.visibility,
            expires_at=payload.expires_at,
            invite_code=invite_code,
        )
        await self.rooms.add(room)
        await self.members.add(RoomMember(room_id=room.id, user_id=owner_id, role=RoomRole.OWNER))
        await self.session.commit()
        return room

    async def update(self, *, room_id: UUID, actor_id: UUID, payload: RoomUpdate) -> Room:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        changes = payload.model_dump(exclude_unset=True)
        if "max_members" in changes:
            count = await self.members.count_for_room(room.id)
            if changes["max_members"] < count:
                raise ConflictError(
                    "max_members cannot be lower than current member count",
                    code="capacity_below_members",
                    details={"current": count},
                )
        for field, value in changes.items():
            setattr(room, field, value)
        await self.session.commit()
        await self.session.refresh(room)
        return room

    async def delete(self, *, room_id: UUID, actor_id: UUID) -> None:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        room.status = RoomStatus.DELETED
        await self.session.commit()

    async def archive(self, *, room_id: UUID, actor_id: UUID) -> Room:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        if room.status == RoomStatus.ARCHIVED:
            return room
        room.status = RoomStatus.ARCHIVED
        await self.session.commit()
        await self.session.refresh(room)
        return room

    async def reactivate(self, *, room_id: UUID, actor_id: UUID) -> Room:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        if room.status == RoomStatus.DELETED:
            raise ConflictError("Cannot reactivate a deleted room", code="room_deleted")
        room.status = RoomStatus.ACTIVE
        await self.session.commit()
        await self.session.refresh(room)
        return room

    async def transfer_ownership(
        self, *, room_id: UUID, actor_id: UUID, new_owner_id: UUID
    ) -> Room:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        if new_owner_id == actor_id:
            raise ConflictError("Already the owner", code="already_owner")
        new_owner_member = await self.members.get_member(room.id, new_owner_id)
        if new_owner_member is None:
            raise ConflictError(
                "New owner must already be a member of the room", code="new_owner_not_member"
            )
        old_owner_member = await self.members.get_member(room.id, actor_id)
        if old_owner_member is not None:
            old_owner_member.role = RoomRole.MEMBER
        new_owner_member.role = RoomRole.OWNER
        room.owner_id = new_owner_id
        await self.session.commit()
        await self.session.refresh(room)
        return room

    async def rotate_invite_code(self, *, room_id: UUID, actor_id: UUID) -> str:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        room.invite_code = await self._generate_invite_code()
        await self.session.commit()
        return room.invite_code

    async def get_detailed(self, *, room_id: UUID, actor_id: UUID) -> RoomDetailed:
        room = await self.rooms.get_with_details(room_id)
        if room is None:
            raise NotFoundError("Room not found", code="room_not_found")
        is_owner = room.owner_id == actor_id
        is_member = is_owner or await self.members.is_member(room.id, actor_id)
        member_count = await self.members.count_for_room(room.id)
        return RoomDetailed(
            **self._room_dict(room),
            owner=UserPublic.model_validate(room.owner),
            member_count=member_count,
            is_member=is_member,
            is_owner=is_owner,
            details=[d.__dict__ for d in room.details],
            invite_code=room.invite_code if is_owner else None,
        )

    async def list_joined(self, *, user_id: UUID, limit: int, offset: int) -> Page[RoomSummary]:
        items, total = await self.rooms.list_for_member(user_id, limit=limit, offset=offset)
        summaries = [await self._to_summary(room=room, actor_id=user_id) for room in items]
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def list_owned(self, *, user_id: UUID, limit: int, offset: int) -> Page[RoomSummary]:
        items, total = await self.rooms.list_owned(user_id, limit=limit, offset=offset)
        summaries = [await self._to_summary(room=room, actor_id=user_id) for room in items]
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def search_text(
        self, *, actor_id: UUID, query: str, limit: int, offset: int
    ) -> Page[RoomSummary]:
        items, total = await self.rooms.search_text(query, limit=limit, offset=offset)
        summaries = [await self._to_summary(room=room, actor_id=actor_id) for room in items]
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def search_nearby(
        self,
        *,
        actor_id: UUID,
        latitude: float,
        longitude: float,
        purpose=None,
        sort: NearbySort = "distance",
        limit: int = 50,
        offset: int = 0,
    ) -> Page[NearbyRoom]:
        limit = min(limit, _MAX_NEARBY_LIMIT)
        lat_min, lat_max, lon_min, lon_max = bounding_box(latitude, longitude, 200)
        candidates = await self.rooms.candidates_in_bbox(
            lat_min=lat_min,
            lat_max=lat_max,
            lon_min=lon_min,
            lon_max=lon_max,
            now=utc_now(),
            purpose=purpose,
        )
        within: list[tuple[Room, float]] = []
        for room in candidates:
            distance = haversine_km(latitude, longitude, room.latitude, room.longitude)
            if distance <= room.radius_km:
                within.append((room, distance))

        if sort == "newest":
            within.sort(key=lambda pair: pair[0].created_at, reverse=True)
        elif sort == "members":
            counts = {pair[0].id: await self.members.count_for_room(pair[0].id) for pair in within}
            within.sort(key=lambda pair: counts[pair[0].id], reverse=True)
        else:
            within.sort(key=lambda pair: pair[1])

        total = len(within)
        sliced = within[offset : offset + limit]
        items: list[NearbyRoom] = []
        for room, distance in sliced:
            summary = await self._to_summary(room=room, actor_id=actor_id)
            items.append(NearbyRoom(**summary.model_dump(), distance_km=round(distance, 4)))
        return Page[NearbyRoom](items=items, total=total, limit=limit, offset=offset)

    async def join_with_location(
        self, *, room_id: UUID, user_id: UUID, payload: JoinRoomRequest
    ) -> RoomMember:
        room = await self._get_or_404(room_id)
        self._ensure_joinable(room)
        if room.visibility == RoomVisibility.PRIVATE:
            raise AuthorizationError("This room is invite-only", code="invite_only")
        distance = haversine_km(payload.latitude, payload.longitude, room.latitude, room.longitude)
        if distance > room.radius_km:
            raise AuthorizationError(
                "You are not within the room's broadcast radius",
                code="out_of_range",
                details={"distance_km": round(distance, 4), "radius_km": room.radius_km},
            )
        return await self._add_member(room=room, user_id=user_id)

    async def join_by_code(self, *, code: str, user_id: UUID) -> Room:
        room = await self.rooms.get_by_invite_code(code)
        if room is None:
            raise NotFoundError("Invite code not recognized", code="invalid_invite")
        self._ensure_joinable(room)
        await self._add_member(room=room, user_id=user_id)
        return room

    async def leave(self, *, room_id: UUID, user_id: UUID) -> None:
        room = await self._get_or_404(room_id)
        if room.owner_id == user_id:
            raise ConflictError(
                "Owner cannot leave; transfer ownership or delete the room first",
                code="owner_cannot_leave",
            )
        member = await self.members.get_member(room.id, user_id)
        if member is None:
            raise NotFoundError("Not a member of this room", code="not_member")
        await self.members.delete(member)
        await self.session.commit()

    async def kick(self, *, room_id: UUID, actor_id: UUID, target_user_id: UUID) -> None:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        if target_user_id == actor_id:
            raise ConflictError("Cannot kick yourself", code="cannot_kick_self")
        member = await self.members.get_member(room.id, target_user_id)
        if member is None:
            raise NotFoundError("Member not found", code="member_not_found")
        await self.members.delete(member)
        await self.session.commit()

    async def list_members(
        self, *, room_id: UUID, actor_id: UUID, limit: int, offset: int
    ) -> Page[dict]:
        await self.ensure_member(room_id=room_id, user_id=actor_id)
        items, total = await self.members.list_for_room(room_id, limit=limit, offset=offset)
        return Page[dict](
            items=[{"user": UserPublic.model_validate(m.user), "role": m.role} for m in items],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def add_detail(
        self, *, room_id: UUID, actor_id: UUID, payload: RoomDetailCreate
    ) -> RoomDetail:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        detail = RoomDetail(room_id=room.id, heading=payload.heading, body=payload.body)
        await self.details.add(detail)
        await self.session.commit()
        return detail

    async def update_detail(
        self,
        *,
        room_id: UUID,
        detail_id: UUID,
        actor_id: UUID,
        payload: RoomDetailUpdate,
    ) -> RoomDetail:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        detail = await self.details.get(detail_id)
        if detail is None or detail.room_id != room.id:
            raise NotFoundError("Detail not found", code="detail_not_found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(detail, field, value)
        await self.session.commit()
        await self.session.refresh(detail)
        return detail

    async def delete_detail(self, *, room_id: UUID, detail_id: UUID, actor_id: UUID) -> None:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        detail = await self.details.get(detail_id)
        if detail is None or detail.room_id != room.id:
            raise NotFoundError("Detail not found", code="detail_not_found")
        await self.details.delete(detail)
        await self.session.commit()

    async def ensure_member(self, *, room_id: UUID, user_id: UUID) -> None:
        if not await self.members.is_member(room_id, user_id):
            raise AuthorizationError("Not a member of this room", code="not_member")

    async def _to_summary(self, *, room: Room, actor_id: UUID) -> RoomSummary:
        is_owner = room.owner_id == actor_id
        is_member = is_owner or await self.members.is_member(room.id, actor_id)
        member_count = await self.members.count_for_room(room.id)
        owner_user = room.owner if "owner" in room.__dict__ else None
        if owner_user is None:
            raise ValidationError(
                "Owner relation must be eager-loaded for summary",
                code="missing_owner_relation",
            )
        return RoomSummary(
            **self._room_dict(room),
            owner=UserPublic.model_validate(owner_user),
            member_count=member_count,
            is_member=is_member,
            is_owner=is_owner,
        )

    async def _add_member(self, *, room: Room, user_id: UUID) -> RoomMember:
        if await self.members.is_member(room.id, user_id):
            raise ConflictError("Already a member of this room", code="already_member")
        current = await self.members.count_for_room(room.id)
        if current >= room.max_members:
            raise ConflictError("Room is at capacity", code="room_full")
        member = RoomMember(room_id=room.id, user_id=user_id, role=RoomRole.MEMBER)
        await self.members.add(member)
        await self.session.commit()
        return member

    async def _get_or_404(self, room_id: UUID) -> Room:
        room = await self.rooms.get_active(room_id)
        if room is None:
            raise NotFoundError("Room not found", code="room_not_found")
        return room

    def _ensure_joinable(self, room: Room) -> None:
        if room.status != RoomStatus.ACTIVE:
            raise ConflictError("Room is not active", code="room_inactive")
        expires_at = ensure_utc(room.expires_at)
        if expires_at is not None and expires_at <= utc_now():
            raise ConflictError("Room has expired", code="room_expired")

    @staticmethod
    def _require_owner(room: Room, actor_id: UUID) -> None:
        if room.owner_id != actor_id:
            raise AuthorizationError(
                "Only the room owner can perform this action", code="not_owner"
            )

    @staticmethod
    def _room_dict(room: Room) -> dict:
        return {
            "id": room.id,
            "owner_id": room.owner_id,
            "name": room.name,
            "purpose": room.purpose,
            "custom_purpose": room.custom_purpose,
            "latitude": room.latitude,
            "longitude": room.longitude,
            "radius_km": room.radius_km,
            "visibility": room.visibility,
            "status": room.status,
            "max_members": room.max_members,
            "expires_at": room.expires_at,
            "created_at": room.created_at,
        }

    async def _generate_invite_code(self) -> str:
        for _ in range(8):
            code = secrets.token_urlsafe(_INVITE_CODE_BYTES)[:12]
            if not await self.rooms.exists(invite_code=code):
                return code
        raise ValidationError(
            "Could not allocate invite code; please retry", code="invite_code_exhausted"
        )
