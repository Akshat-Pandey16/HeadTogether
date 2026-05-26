from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, RoomServiceDep
from app.schemas.room import (
    NearbyRoomRead,
    RoomCreate,
    RoomDetailCreate,
    RoomDetailedRead,
    RoomDetailRead,
    RoomMemberRead,
    RoomRead,
    RoomUpdate,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomRead:
    room = await rooms.create(owner_id=current_user.id, payload=payload)
    return RoomRead.model_validate(room)


@router.get("", response_model=list[RoomRead])
async def list_my_rooms(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> list[RoomRead]:
    items = await rooms.list_joined(current_user.id)
    return [RoomRead.model_validate(room) for room in items]


@router.get("/nearby", response_model=list[NearbyRoomRead])
async def search_nearby(
    current_user: CurrentUser,
    rooms: RoomServiceDep,
    latitude: Annotated[float, Query(ge=-90, le=90)],
    longitude: Annotated[float, Query(ge=-180, le=180)],
) -> list[NearbyRoomRead]:
    _ = current_user
    return await rooms.search_nearby(latitude=latitude, longitude=longitude)


@router.get("/{room_id}", response_model=RoomDetailedRead)
async def get_room(
    room_id: UUID,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomDetailedRead:
    _ = current_user
    room = await rooms.get_or_404(room_id)
    return RoomDetailedRead.model_validate(room)


@router.patch("/{room_id}", response_model=RoomRead)
async def update_room(
    room_id: UUID,
    payload: RoomUpdate,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> RoomRead:
    room = await rooms.get_or_404(room_id)
    updated = await rooms.update(room=room, actor_id=current_user.id, payload=payload)
    return RoomRead.model_validate(updated)


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
    room = await rooms.get_or_404(room_id)
    detail = await rooms.add_detail(room=room, actor_id=current_user.id, payload=payload)
    return RoomDetailRead.model_validate(detail)


@router.post(
    "/{room_id}/members",
    status_code=status.HTTP_201_CREATED,
)
async def join_room(
    room_id: UUID,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> dict[str, str]:
    room = await rooms.get_or_404(room_id)
    await rooms.join(room=room, user_id=current_user.id)
    return {"message": "joined", "room_id": str(room.id)}


@router.get("/{room_id}/members", response_model=list[RoomMemberRead])
async def list_room_members(
    room_id: UUID,
    current_user: CurrentUser,
    rooms: RoomServiceDep,
) -> list[RoomMemberRead]:
    members = await rooms.list_members(room_id=room_id, actor_id=current_user.id)
    return [RoomMemberRead.model_validate(m) for m in members]
