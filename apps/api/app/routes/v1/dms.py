from __future__ import annotations

from fastapi import APIRouter, status

from app.deps import CurrentUser, DMServiceDep
from app.schemas.dm import CreateDMRequest, DMRead
from app.schemas.room import RoomRead
from app.schemas.user import UserPublic

router = APIRouter(prefix="/dms", tags=["dms"])


@router.post("", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
async def create_or_get_dm(
    payload: CreateDMRequest, current_user: CurrentUser, dms: DMServiceDep
) -> RoomRead:
    room = await dms.create_or_get(actor_id=current_user.id, recipient_id=payload.recipient_user_id)
    return RoomRead.model_validate(room)


@router.get("", response_model=list[DMRead])
async def list_dms(current_user: CurrentUser, dms: DMServiceDep) -> list[DMRead]:
    rooms = await dms.list_for_user(user_id=current_user.id)
    return [
        DMRead(
            id=room.id,
            created_at=room.created_at,
            participants=[UserPublic.model_validate(m.user) for m in room.members],
        )
        for room in rooms
    ]
