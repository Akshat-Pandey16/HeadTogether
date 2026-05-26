from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, RoomServiceDep
from app.models.enums import MembershipState, RoomPurpose
from app.schemas.common import GenericMessage, Page
from app.schemas.room import (
    InviteCodeResponse,
    JoinByCodeRequest,
    JoinRoomRequest,
    NearbyRoom,
    NearbySort,
    PromoteRequest,
    RoomCreate,
    RoomDetailCreate,
    RoomDetailed,
    RoomDetailRead,
    RoomDetailUpdate,
    RoomEventRead,
    RoomMemberRead,
    RoomRead,
    RoomSummary,
    RoomUpdate,
    TextSort,
    TransferOwnershipRequest,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate, current_user: CurrentUser, rooms: RoomServiceDep
) -> RoomRead:
    room = await rooms.create(owner_id=current_user.id, payload=payload)
    return RoomRead.model_validate(room)


@router.get("", response_model=Page[RoomSummary])
async def list_joined(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    include_archived: bool = False,
) -> Page[RoomSummary]:
    return await rooms.list_joined(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        include_archived=include_archived,
    )


@router.get("/owned", response_model=Page[RoomSummary])
async def list_owned(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[RoomSummary]:
    return await rooms.list_owned(user_id=current_user.id, limit=limit, offset=offset)


@router.get("/past", response_model=Page[RoomSummary])
async def list_past(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[RoomSummary]:
    return await rooms.list_past(user_id=current_user.id, limit=limit, offset=offset)


@router.get("/saved", response_model=Page[RoomSummary])
async def list_saved(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[RoomSummary]:
    return await rooms.list_saved(user_id=current_user.id, limit=limit, offset=offset)


@router.get("/search", response_model=Page[RoomSummary])
async def search_rooms(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    q: Annotated[str, Query(min_length=1, max_length=120)],
    purpose: RoomPurpose | None = None,
    sort: TextSort = "newest",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[RoomSummary]:
    return await rooms.search_text(
        actor_id=current_user.id,
        query=q,
        purpose=purpose,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@router.get("/nearby", response_model=Page[NearbyRoom])
async def search_nearby(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
    purpose: RoomPurpose | None = None,
    sort: NearbySort = "distance",
    max_distance_km: Annotated[float, Query(gt=0, le=200)] | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[NearbyRoom]:
    return await rooms.search_nearby(
        actor_id=current_user.id,
        latitude=latitude,
        longitude=longitude,
        purpose=purpose,
        sort=sort,
        max_distance_km=max_distance_km,
        limit=limit,
        offset=offset,
    )


@router.post("/join-by-code", response_model=RoomRead)
async def join_by_code(
    payload: JoinByCodeRequest,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomRead:
    room, _member, _waitlisted = await rooms.join_by_code(
        code=payload.invite_code, user_id=current_user.id
    )
    return RoomRead.model_validate(room)


@router.get("/{room_id}", response_model=RoomDetailed)
async def get_room(room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep) -> RoomDetailed:
    return await rooms.get_detailed(room_id=room_id, actor_id=current_user.id)


@router.patch("/{room_id}", response_model=RoomRead)
async def update_room(
    room_id: UUID,
    payload: RoomUpdate,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomRead:
    room = await rooms.update(room_id=room_id, actor_id=current_user.id, payload=payload)
    return RoomRead.model_validate(room)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep) -> None:
    await rooms.delete(room_id=room_id, actor_id=current_user.id)


@router.post("/{room_id}/restore", response_model=RoomRead)
async def restore_room(room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep) -> RoomRead:
    room = await rooms.restore(room_id=room_id, actor_id=current_user.id)
    return RoomRead.model_validate(room)


@router.post("/{room_id}/archive", response_model=RoomRead)
async def archive_room(room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep) -> RoomRead:
    room = await rooms.archive(room_id=room_id, actor_id=current_user.id)
    return RoomRead.model_validate(room)


@router.post("/{room_id}/reactivate", response_model=RoomRead)
async def reactivate_room(
    room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep
) -> RoomRead:
    room = await rooms.reactivate(room_id=room_id, actor_id=current_user.id)
    return RoomRead.model_validate(room)


@router.post("/{room_id}/transfer", response_model=RoomRead)
async def transfer_ownership(
    room_id: UUID,
    payload: TransferOwnershipRequest,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomRead:
    room = await rooms.transfer_ownership(
        room_id=room_id,
        actor_id=current_user.id,
        new_owner_id=payload.new_owner_id,
    )
    return RoomRead.model_validate(room)


@router.post("/{room_id}/promote", response_model=GenericMessage)
async def promote_to_moderator(
    room_id: UUID,
    payload: PromoteRequest,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> GenericMessage:
    await rooms.promote(room_id=room_id, actor_id=current_user.id, target_user_id=payload.user_id)
    return GenericMessage(message="promoted")


@router.post("/{room_id}/demote", response_model=GenericMessage)
async def demote_moderator(
    room_id: UUID,
    payload: PromoteRequest,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> GenericMessage:
    await rooms.demote(room_id=room_id, actor_id=current_user.id, target_user_id=payload.user_id)
    return GenericMessage(message="demoted")


@router.post("/{room_id}/rotate-invite", response_model=InviteCodeResponse)
async def rotate_invite_code(
    room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep
) -> InviteCodeResponse:
    code = await rooms.rotate_invite_code(room_id=room_id, actor_id=current_user.id)
    return InviteCodeResponse(invite_code=code)


@router.post(
    "/{room_id}/details",
    response_model=RoomDetailRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_room_detail(
    room_id: UUID,
    payload: RoomDetailCreate,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomDetailRead:
    detail = await rooms.add_detail(room_id=room_id, actor_id=current_user.id, payload=payload)
    return RoomDetailRead.model_validate(detail)


@router.patch("/{room_id}/details/{detail_id}", response_model=RoomDetailRead)
async def update_room_detail(
    room_id: UUID,
    detail_id: UUID,
    payload: RoomDetailUpdate,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomDetailRead:
    detail = await rooms.update_detail(
        room_id=room_id,
        detail_id=detail_id,
        actor_id=current_user.id,
        payload=payload,
    )
    return RoomDetailRead.model_validate(detail)


@router.delete("/{room_id}/details/{detail_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_detail(
    room_id: UUID,
    detail_id: UUID,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> None:
    await rooms.delete_detail(room_id=room_id, detail_id=detail_id, actor_id=current_user.id)


@router.post(
    "/{room_id}/members",
    status_code=status.HTTP_201_CREATED,
    response_model=GenericMessage,
)
async def join_room(
    room_id: UUID,
    payload: JoinRoomRequest,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> GenericMessage:
    _member, waitlisted = await rooms.join_with_location(
        room_id=room_id, user_id=current_user.id, payload=payload
    )
    return GenericMessage(message="waitlisted" if waitlisted else "joined")


@router.get("/{room_id}/members", response_model=Page[RoomMemberRead])
async def list_room_members(
    room_id: UUID,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    state: MembershipState | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[RoomMemberRead]:
    return await rooms.list_members(
        room_id=room_id,
        actor_id=current_user.id,
        limit=limit,
        offset=offset,
        state=state,
    )


@router.delete("/{room_id}/members/me", status_code=status.HTTP_204_NO_CONTENT)
async def leave_room(room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep) -> None:
    await rooms.leave(room_id=room_id, user_id=current_user.id)


@router.delete("/{room_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def kick_member(
    room_id: UUID,
    user_id: UUID,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> None:
    await rooms.kick(room_id=room_id, actor_id=current_user.id, target_user_id=user_id)


@router.post("/{room_id}/save", response_model=GenericMessage)
async def save_room(
    room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep
) -> GenericMessage:
    await rooms.save_room(user_id=current_user.id, room_id=room_id)
    return GenericMessage(message="saved")


@router.delete("/{room_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_room(room_id: UUID, current_user: CurrentUser, rooms: RoomServiceDep) -> None:
    await rooms.unsave_room(user_id=current_user.id, room_id=room_id)


@router.get("/{room_id}/events", response_model=Page[RoomEventRead])
async def list_room_events(
    room_id: UUID,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[RoomEventRead]:
    return await rooms.list_events(
        room_id=room_id, actor_id=current_user.id, limit=limit, offset=offset
    )
