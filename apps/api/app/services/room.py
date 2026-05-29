from __future__ import annotations

import json
import secrets
from datetime import timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AuthorizationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.models.enums import (
    MembershipState,
    NotificationType,
    RoomEventType,
    RoomRole,
    RoomStatus,
    RoomVisibility,
)
from app.models.room import Room, RoomDetail, RoomEvent, RoomMember, SavedRoom
from app.realtime.broker import get_broker, room_channel
from app.realtime.events import WsEvent
from app.repositories.moderation import BlockRepository
from app.repositories.room import (
    RoomDetailRepository,
    RoomEventRepository,
    RoomMemberRepository,
    RoomRepository,
    SavedRoomRepository,
)
from app.repositories.tag import RoomTagRepository
from app.schemas.common import Page
from app.schemas.room import (
    JoinRoomRequest,
    NearbyRoom,
    NearbySort,
    RoomCreate,
    RoomDetailCreate,
    RoomDetailed,
    RoomDetailUpdate,
    RoomEventRead,
    RoomSummary,
    RoomUpdate,
    TextSort,
)
from app.schemas.tag import TagRead
from app.schemas.user import UserPublic
from app.services.geo import bounding_box, haversine_km
from app.services.notifications import NotificationDraft, NotificationService
from app.services.tag import TagService
from app.utils.time import ensure_utc, utc_now

_INVITE_CODE_BYTES = 9
_MAX_NEARBY_LIMIT = 100
_RESTORE_WINDOW_DAYS = 7


class RoomService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.rooms = RoomRepository(session)
        self.members = RoomMemberRepository(session)
        self.details = RoomDetailRepository(session)
        self.saved = SavedRoomRepository(session)
        self.events = RoomEventRepository(session)
        self.blocks = BlockRepository(session)
        self.room_tags = RoomTagRepository(session)
        self.tag_service = TagService(session)
        self.notify_service = NotificationService(session)

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
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            cover_photo_url=payload.cover_photo_url,
            description=payload.description,
            invite_code=invite_code,
        )
        await self.rooms.add(room)
        await self.members.add(
            RoomMember(
                room_id=room.id,
                user_id=owner_id,
                role=RoomRole.OWNER,
                state=MembershipState.ACTIVE,
            )
        )
        if payload.tags:
            await self.tag_service.set_room_tags(room.id, payload.tags)
        await self._record_event(room=room, actor_id=owner_id, event_type=RoomEventType.CREATED)
        await self.session.commit()
        return room

    async def update(self, *, room_id: UUID, actor_id: UUID, payload: RoomUpdate) -> Room:
        room = await self._get_or_404(room_id)
        actor_role = await self._role_of(room, actor_id)
        self._require_owner_or_moderator(room, actor_id, actor_role)
        changes = payload.model_dump(exclude_unset=True)
        if "max_members" in changes:
            count = await self.members.count_active(room.id)
            if changes["max_members"] < count:
                raise ConflictError(
                    "max_members cannot be lower than current member count",
                    code="capacity_below_members",
                    details={"current": count},
                )
        if "starts_at" in changes or "ends_at" in changes:
            starts_at = changes.get("starts_at", room.starts_at)
            ends_at = changes.get("ends_at", room.ends_at)
            if starts_at and ends_at and ends_at <= starts_at:
                raise ValidationError("ends_at must be after starts_at", code="invalid_schedule")
        for field, value in changes.items():
            setattr(room, field, value)
        if room.visibility == RoomVisibility.PRIVATE and not room.invite_code:
            room.invite_code = await self._generate_invite_code()
        await self._record_event(
            room=room,
            actor_id=actor_id,
            event_type=RoomEventType.UPDATED,
            payload=json.dumps({k: str(v) for k, v in changes.items()}),
        )
        await self.session.commit()
        await self.session.refresh(room)
        return room

    async def delete(self, *, room_id: UUID, actor_id: UUID) -> None:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        now = utc_now()
        room.status = RoomStatus.DELETED
        room.deleted_at = now
        room.restore_until = now + timedelta(days=_RESTORE_WINDOW_DAYS)
        await self._record_event(room=room, actor_id=actor_id, event_type=RoomEventType.DELETED)
        await self.session.commit()
        await self._notify_room_members(
            room=room, actor_id=actor_id, type=NotificationType.ROOM_DELETED
        )

    async def restore(self, *, room_id: UUID, actor_id: UUID) -> Room:
        room = await self.rooms.get_any(room_id)
        if room is None or room.status != RoomStatus.DELETED:
            raise NotFoundError("Room not found", code="room_not_found")
        self._require_owner(room, actor_id)
        restore_until = ensure_utc(room.restore_until)
        if restore_until is None or restore_until < utc_now():
            raise ConflictError("Restore window has passed", code="restore_window_expired")
        room.status = RoomStatus.ACTIVE
        room.deleted_at = None
        room.restore_until = None
        await self._record_event(room=room, actor_id=actor_id, event_type=RoomEventType.RESTORED)
        await self.session.commit()
        await self.session.refresh(room)
        return room

    async def archive(self, *, room_id: UUID, actor_id: UUID) -> Room:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        if room.status == RoomStatus.ARCHIVED:
            return room
        room.status = RoomStatus.ARCHIVED
        await self._record_event(room=room, actor_id=actor_id, event_type=RoomEventType.ARCHIVED)
        await self.session.commit()
        await self.session.refresh(room)
        await self._notify_room_members(
            room=room, actor_id=actor_id, type=NotificationType.ROOM_ARCHIVED
        )
        return room

    async def reactivate(self, *, room_id: UUID, actor_id: UUID) -> Room:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        if room.status == RoomStatus.DELETED:
            raise ConflictError("Cannot reactivate a deleted room", code="room_deleted")
        room.status = RoomStatus.ACTIVE
        await self._record_event(room=room, actor_id=actor_id, event_type=RoomEventType.REACTIVATED)
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
        if new_owner_member is None or new_owner_member.state != MembershipState.ACTIVE:
            raise ConflictError(
                "New owner must already be a member of the room",
                code="new_owner_not_member",
            )
        old_owner_member = await self.members.get_member(room.id, actor_id)
        if old_owner_member is not None:
            old_owner_member.role = RoomRole.MODERATOR
        new_owner_member.role = RoomRole.OWNER
        room.owner_id = new_owner_id
        await self._record_event(
            room=room,
            actor_id=actor_id,
            event_type=RoomEventType.OWNERSHIP_TRANSFERRED,
            target_user_id=new_owner_id,
        )
        await self.session.commit()
        await self.session.refresh(room)
        await self.notify_service.notify(
            user_id=new_owner_id,
            type=NotificationType.OWNERSHIP_TRANSFERRED,
            actor_id=actor_id,
            room_id=room.id,
            payload={"room_name": room.name},
        )
        return room

    async def promote(self, *, room_id: UUID, actor_id: UUID, target_user_id: UUID) -> RoomMember:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        member = await self.members.get_member(room.id, target_user_id)
        if member is None or member.state != MembershipState.ACTIVE:
            raise NotFoundError("Member not found", code="member_not_found")
        if member.role == RoomRole.OWNER:
            raise ConflictError("Cannot promote the owner", code="cannot_promote_owner")
        member.role = RoomRole.MODERATOR
        await self._record_event(
            room=room,
            actor_id=actor_id,
            event_type=RoomEventType.MEMBER_PROMOTED,
            target_user_id=target_user_id,
        )
        await self.session.commit()
        await self.notify_service.notify(
            user_id=target_user_id,
            type=NotificationType.ROOM_PROMOTED,
            actor_id=actor_id,
            room_id=room.id,
            payload={"room_name": room.name},
        )
        return member

    async def demote(self, *, room_id: UUID, actor_id: UUID, target_user_id: UUID) -> RoomMember:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        member = await self.members.get_member(room.id, target_user_id)
        if member is None or member.state != MembershipState.ACTIVE:
            raise NotFoundError("Member not found", code="member_not_found")
        if member.role != RoomRole.MODERATOR:
            raise ConflictError("Member is not a moderator", code="not_moderator")
        member.role = RoomRole.MEMBER
        await self._record_event(
            room=room,
            actor_id=actor_id,
            event_type=RoomEventType.MEMBER_DEMOTED,
            target_user_id=target_user_id,
        )
        await self.session.commit()
        await self.notify_service.notify(
            user_id=target_user_id,
            type=NotificationType.ROOM_DEMOTED,
            actor_id=actor_id,
            room_id=room.id,
            payload={"room_name": room.name},
        )
        return member

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
        member = await self.members.get_member(room.id, actor_id)
        is_member = is_owner or (member is not None and member.state == MembershipState.ACTIVE)
        member_count = await self.members.count_active(room.id)
        waitlist_count = 0
        if is_owner:
            _, waitlist_count = await self.members.list_for_room(
                room.id, limit=0, offset=0, state=MembershipState.WAITLISTED
            )
        is_saved = await self.saved.exists(user_id=actor_id, room_id=room.id)
        tags = [TagRead.model_validate(rt.tag) for rt in room.tags]
        return RoomDetailed(
            **self._room_dict(room, actor_id=actor_id, is_member=is_member),
            owner=UserPublic.model_validate(room.owner),
            member_count=member_count,
            is_member=is_member,
            is_owner=is_owner,
            is_saved=is_saved,
            role=member.role if member is not None else None,
            state=member.state if member is not None else None,
            tags=tags,
            details=[d.__dict__ for d in room.details],
            invite_code=room.invite_code if is_owner else None,
            waitlist_count=waitlist_count,
        )

    async def list_joined(
        self,
        *,
        user_id: UUID,
        limit: int,
        offset: int,
        include_archived: bool = False,
    ) -> Page[RoomSummary]:
        items, total = await self.rooms.list_for_member(
            user_id, limit=limit, offset=offset, include_archived=include_archived
        )
        summaries = await self._summaries(items, user_id)
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def list_owned(self, *, user_id: UUID, limit: int, offset: int) -> Page[RoomSummary]:
        items, total = await self.rooms.list_owned(user_id, limit=limit, offset=offset)
        summaries = await self._summaries(items, user_id)
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def list_past(self, *, user_id: UUID, limit: int, offset: int) -> Page[RoomSummary]:
        items, total = await self.rooms.list_past_for_member(
            user_id, now=utc_now(), limit=limit, offset=offset
        )
        summaries = await self._summaries(items, user_id)
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def list_saved(self, *, user_id: UUID, limit: int, offset: int) -> Page[RoomSummary]:
        items, total = await self.saved.list_for_user(user_id, limit=limit, offset=offset)
        summaries = await self._summaries(items, user_id)
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def save_room(self, *, user_id: UUID, room_id: UUID) -> None:
        await self._get_or_404(room_id)
        if await self.saved.exists(user_id=user_id, room_id=room_id):
            return
        await self.saved.add(SavedRoom(user_id=user_id, room_id=room_id))
        await self.session.commit()

    async def unsave_room(self, *, user_id: UUID, room_id: UUID) -> None:
        await self.saved.delete_by(user_id=user_id, room_id=room_id)
        await self.session.commit()

    async def search_text(
        self,
        *,
        actor_id: UUID,
        query: str,
        purpose=None,
        sort: TextSort = "newest",
        limit: int,
        offset: int,
    ) -> Page[RoomSummary]:
        excluded = await self.blocks.blocked_either_way(actor_id)
        items, total = await self.rooms.search_text(
            query=query,
            actor_id=actor_id,
            purpose=purpose,
            order_by=sort,
            limit=limit,
            offset=offset,
            excluded_user_ids=excluded,
        )
        summaries = await self._summaries(items, actor_id)
        return Page[RoomSummary](items=summaries, total=total, limit=limit, offset=offset)

    async def search_nearby(
        self,
        *,
        actor_id: UUID,
        latitude: float,
        longitude: float,
        purpose=None,
        sort: NearbySort = "distance",
        max_distance_km: float | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Page[NearbyRoom]:
        limit = min(limit, _MAX_NEARBY_LIMIT)
        bbox_radius = min(max_distance_km or 200.0, 200.0)
        lat_min, lat_max, lon_min, lon_max = bounding_box(latitude, longitude, bbox_radius)
        excluded = await self.blocks.blocked_either_way(actor_id)
        candidates = await self.rooms.candidates_in_bbox(
            lat_min=lat_min,
            lat_max=lat_max,
            lon_min=lon_min,
            lon_max=lon_max,
            now=utc_now(),
            purpose=purpose,
            excluded_user_ids=excluded,
        )
        within: list[tuple[Room, float]] = []
        for room in candidates:
            distance = haversine_km(latitude, longitude, room.latitude, room.longitude)
            if distance > room.radius_km:
                continue
            if max_distance_km is not None and distance > max_distance_km:
                continue
            within.append((room, distance))

        if sort == "newest":
            within.sort(key=lambda pair: pair[0].created_at, reverse=True)
        elif sort == "starts_at":
            within.sort(
                key=lambda pair: (
                    pair[0].starts_at is None,
                    pair[0].starts_at or pair[0].created_at,
                )
            )
        elif sort == "members":
            counts = await self.members.count_active_for_rooms([pair[0].id for pair in within])
            within.sort(key=lambda pair: counts.get(pair[0].id, 0), reverse=True)
        else:
            within.sort(key=lambda pair: pair[1])

        total = len(within)
        sliced = within[offset : offset + limit]
        summaries = await self._summaries([room for room, _ in sliced], actor_id)
        items = [
            NearbyRoom(**summary.model_dump(), distance_km=round(distance, 4))
            for summary, (_, distance) in zip(summaries, sliced, strict=True)
        ]
        return Page[NearbyRoom](items=items, total=total, limit=limit, offset=offset)

    async def join_with_location(
        self, *, room_id: UUID, user_id: UUID, payload: JoinRoomRequest
    ) -> tuple[RoomMember, bool]:
        room = await self._get_or_404(room_id)
        self._ensure_joinable(room)
        if room.visibility == RoomVisibility.PRIVATE:
            raise AuthorizationError("This room is invite-only", code="invite_only")
        if room.visibility == RoomVisibility.DM:
            raise AuthorizationError("Direct messages are not joinable", code="dm_only")
        if await self.blocks.is_blocked(actor_id=user_id, target_id=room.owner_id):
            raise AuthorizationError("Cannot join this room", code="blocked")
        distance = haversine_km(payload.latitude, payload.longitude, room.latitude, room.longitude)
        if distance > room.radius_km:
            raise AuthorizationError(
                "You are not within the room's broadcast radius",
                code="out_of_range",
                details={
                    "distance_km": round(distance, 4),
                    "radius_km": room.radius_km,
                },
            )
        return await self._add_member(room=room, user_id=user_id)

    async def join_by_code(self, *, code: str, user_id: UUID) -> tuple[Room, RoomMember, bool]:
        room = await self.rooms.get_by_invite_code(code)
        if room is None:
            raise NotFoundError("Invite code not recognized", code="invalid_invite")
        self._ensure_joinable(room)
        if await self.blocks.is_blocked(actor_id=user_id, target_id=room.owner_id):
            raise AuthorizationError("Cannot join this room", code="blocked")
        member, waitlisted = await self._add_member(room=room, user_id=user_id)
        return room, member, waitlisted

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
        await self._record_event(
            room=room,
            actor_id=user_id,
            event_type=RoomEventType.MEMBER_LEFT,
            target_user_id=user_id,
        )
        await self._promote_from_waitlist_if_room(room)
        await self.session.commit()
        await self._broadcast_room_event(room.id, WsEvent.MEMBER_LEFT, {"user_id": str(user_id)})

    async def kick(self, *, room_id: UUID, actor_id: UUID, target_user_id: UUID) -> None:
        room = await self._get_or_404(room_id)
        actor_role = await self._role_of(room, actor_id)
        self._require_owner_or_moderator(room, actor_id, actor_role)
        if target_user_id == actor_id:
            raise ConflictError("Cannot kick yourself", code="cannot_kick_self")
        target = await self.members.get_member(room.id, target_user_id)
        if target is None:
            raise NotFoundError("Member not found", code="member_not_found")
        if target.role == RoomRole.OWNER:
            raise AuthorizationError("Cannot kick the owner", code="cannot_kick_owner")
        if target.role == RoomRole.MODERATOR and actor_role != RoomRole.OWNER:
            raise AuthorizationError("Only the owner can remove a moderator", code="not_owner")
        await self.members.delete(target)
        await self._record_event(
            room=room,
            actor_id=actor_id,
            event_type=RoomEventType.MEMBER_KICKED,
            target_user_id=target_user_id,
        )
        await self._promote_from_waitlist_if_room(room)
        await self.session.commit()
        await self._broadcast_room_event(
            room.id,
            WsEvent.MEMBER_KICKED,
            {"user_id": str(target_user_id), "actor_id": str(actor_id)},
        )
        await self.notify_service.notify(
            user_id=target_user_id,
            type=NotificationType.ROOM_KICKED,
            actor_id=actor_id,
            room_id=room.id,
            payload={"room_name": room.name},
        )

    async def list_members(
        self,
        *,
        room_id: UUID,
        actor_id: UUID,
        limit: int,
        offset: int,
        state: MembershipState | None = None,
    ) -> Page[dict]:
        await self.ensure_member(room_id=room_id, user_id=actor_id)
        items, total = await self.members.list_for_room(
            room_id, limit=limit, offset=offset, state=state
        )
        return Page[dict](
            items=[
                {
                    "user": UserPublic.model_validate(m.user),
                    "role": m.role,
                    "state": m.state,
                }
                for m in items
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def add_detail(
        self, *, room_id: UUID, actor_id: UUID, payload: RoomDetailCreate
    ) -> RoomDetail:
        room = await self._get_or_404(room_id)
        actor_role = await self._role_of(room, actor_id)
        self._require_owner_or_moderator(room, actor_id, actor_role)
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
        actor_role = await self._role_of(room, actor_id)
        self._require_owner_or_moderator(room, actor_id, actor_role)
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
        actor_role = await self._role_of(room, actor_id)
        self._require_owner_or_moderator(room, actor_id, actor_role)
        detail = await self.details.get(detail_id)
        if detail is None or detail.room_id != room.id:
            raise NotFoundError("Detail not found", code="detail_not_found")
        await self.details.delete(detail)
        await self.session.commit()

    async def list_events(
        self, *, room_id: UUID, actor_id: UUID, limit: int, offset: int
    ) -> Page[RoomEventRead]:
        room = await self._get_or_404(room_id)
        self._require_owner(room, actor_id)
        items, total = await self.events.list_for_room(room.id, limit=limit, offset=offset)
        return Page[RoomEventRead](
            items=[RoomEventRead.model_validate(e) for e in items],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def ensure_member(self, *, room_id: UUID, user_id: UUID) -> None:
        if not await self.members.is_active_member(room_id, user_id):
            raise AuthorizationError("Not a member of this room", code="not_member")

    async def _summaries(self, rooms: list[Room], actor_id: UUID) -> list[RoomSummary]:
        if not rooms:
            return []
        room_ids = [room.id for room in rooms]
        counts = await self.members.count_active_for_rooms(room_ids)
        memberships = await self.members.memberships_for_user(actor_id, room_ids)
        saved_ids = await self.saved.saved_ids(actor_id, room_ids)
        tags_map = await self.room_tags.tags_for_rooms(room_ids)
        summaries: list[RoomSummary] = []
        for room in rooms:
            member = memberships.get(room.id)
            is_owner = room.owner_id == actor_id
            is_member = is_owner or (member is not None and member.state == MembershipState.ACTIVE)
            summaries.append(
                RoomSummary(
                    **self._room_dict(room, actor_id=actor_id, is_member=is_member),
                    owner=UserPublic.model_validate(room.owner),
                    member_count=counts.get(room.id, 0),
                    is_member=is_member,
                    is_owner=is_owner,
                    is_saved=room.id in saved_ids,
                    role=member.role if member is not None else None,
                    state=member.state if member is not None else None,
                    tags=[TagRead.model_validate(t) for t in tags_map.get(room.id, [])],
                )
            )
        return summaries

    async def _add_member(self, *, room: Room, user_id: UUID) -> tuple[RoomMember, bool]:
        existing = await self.members.get_member(room.id, user_id)
        if existing is not None:
            if existing.state == MembershipState.BANNED:
                raise AuthorizationError("You are banned from this room", code="banned")
            if existing.state == MembershipState.ACTIVE:
                raise ConflictError("Already a member of this room", code="already_member")
            if existing.state == MembershipState.WAITLISTED:
                raise ConflictError("Already on the waitlist", code="already_waitlisted")
        await self.rooms.lock(room.id)
        current = await self.members.count_active(room.id)
        waitlisted = current >= room.max_members
        member = RoomMember(
            room_id=room.id,
            user_id=user_id,
            role=RoomRole.MEMBER,
            state=MembershipState.WAITLISTED if waitlisted else MembershipState.ACTIVE,
        )
        try:
            await self.members.add(member)
            await self._record_event(
                room=room,
                actor_id=user_id,
                event_type=(
                    RoomEventType.WAITLIST_JOINED if waitlisted else RoomEventType.MEMBER_JOINED
                ),
                target_user_id=user_id,
            )
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raced = await self.members.get_member(room.id, user_id)
            if raced is not None:
                return raced, raced.state != MembershipState.ACTIVE
            raise
        if not waitlisted:
            await self._broadcast_room_event(
                room.id, WsEvent.MEMBER_JOINED, {"user_id": str(user_id)}
            )
        return member, waitlisted

    async def _promote_from_waitlist_if_room(self, room: Room) -> None:
        current = await self.members.count_active(room.id)
        while current < room.max_members:
            next_in_line = await self.members.first_waitlisted(room.id)
            if next_in_line is None:
                break
            next_in_line.state = MembershipState.ACTIVE
            await self._record_event(
                room=room,
                actor_id=next_in_line.user_id,
                event_type=RoomEventType.WAITLIST_PROMOTED,
                target_user_id=next_in_line.user_id,
            )
            await self.notify_service.notify(
                user_id=next_in_line.user_id,
                type=NotificationType.WAITLIST_PROMOTED,
                room_id=room.id,
                payload={"room_name": room.name},
            )
            await self._broadcast_room_event(
                room.id, WsEvent.MEMBER_JOINED, {"user_id": str(next_in_line.user_id)}
            )
            current += 1

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
        ends_at = ensure_utc(room.ends_at)
        if ends_at is not None and ends_at <= utc_now():
            raise ConflictError("Room has ended", code="room_ended")

    async def _role_of(self, room: Room, actor_id: UUID) -> RoomRole | None:
        if room.owner_id == actor_id:
            return RoomRole.OWNER
        member = await self.members.get_member(room.id, actor_id)
        if member is None or member.state != MembershipState.ACTIVE:
            return None
        return member.role

    @staticmethod
    def _require_owner(room: Room, actor_id: UUID) -> None:
        if room.owner_id != actor_id:
            raise AuthorizationError(
                "Only the room owner can perform this action", code="not_owner"
            )

    @staticmethod
    def _require_owner_or_moderator(room: Room, actor_id: UUID, role: RoomRole | None) -> None:
        if room.owner_id == actor_id:
            return
        if role == RoomRole.MODERATOR:
            return
        raise AuthorizationError(
            "Only the owner or a moderator can perform this action",
            code="not_authorized",
        )

    async def _record_event(
        self,
        *,
        room: Room,
        actor_id: UUID | None,
        event_type: RoomEventType,
        target_user_id: UUID | None = None,
        payload: str | None = None,
    ) -> None:
        event = RoomEvent(
            room_id=room.id,
            event_type=event_type,
            actor_id=actor_id,
            target_user_id=target_user_id,
            payload=payload,
        )
        await self.events.add(event)

    def _room_dict(self, room: Room, *, actor_id: UUID, is_member: bool) -> dict:
        lat = room.latitude
        lng = room.longitude
        if not is_member and room.owner_id != actor_id:
            lat = round(lat, 2)
            lng = round(lng, 2)
        return {
            "id": room.id,
            "owner_id": room.owner_id,
            "name": room.name,
            "purpose": room.purpose,
            "custom_purpose": room.custom_purpose,
            "latitude": lat,
            "longitude": lng,
            "radius_km": room.radius_km,
            "visibility": room.visibility,
            "status": room.status,
            "max_members": room.max_members,
            "expires_at": room.expires_at,
            "starts_at": room.starts_at,
            "ends_at": room.ends_at,
            "cover_photo_url": room.cover_photo_url,
            "description": room.description,
            "created_at": room.created_at,
        }

    async def _generate_invite_code(self) -> str:
        for _ in range(8):
            code = secrets.token_urlsafe(_INVITE_CODE_BYTES)[:12]
            if not await self.rooms.exists(invite_code=code):
                return code
        raise ValidationError(
            "Could not allocate invite code; please retry",
            code="invite_code_exhausted",
        )

    async def _broadcast_room_event(
        self, room_id: UUID, event: WsEvent, data: dict[str, str]
    ) -> None:
        broker = get_broker()
        await broker.publish(
            room_channel(str(room_id)),
            {"type": event.value, "data": data},
        )

    async def _notify_room_members(
        self, *, room: Room, actor_id: UUID, type: NotificationType
    ) -> None:
        members, _ = await self.members.list_for_room(
            room.id, limit=500, offset=0, state=MembershipState.ACTIVE
        )
        await self.notify_service.notify_many(
            [
                NotificationDraft(
                    user_id=m.user_id,
                    type=type,
                    actor_id=actor_id,
                    room_id=room.id,
                    payload={"room_name": room.name},
                )
                for m in members
                if m.user_id != actor_id
            ]
        )
