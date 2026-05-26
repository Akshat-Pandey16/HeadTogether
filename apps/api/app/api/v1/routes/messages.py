from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, MessageServiceDep
from app.schemas.common import Page
from app.schemas.message import MessageCreate, MessageRead

router = APIRouter(prefix="/rooms/{room_id}/messages", tags=["messages"])


@router.get("", response_model=Page[MessageRead])
async def list_messages(
    room_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[MessageRead]:
    items, total = await messages.list(
        room_id=room_id, actor_id=current_user.id, limit=limit, offset=offset
    )
    return Page[MessageRead](
        items=[MessageRead.model_validate(m) for m in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def post_message(
    room_id: UUID,
    payload: MessageCreate,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> MessageRead:
    message = await messages.post(room_id=room_id, sender_id=current_user.id, payload=payload)
    return MessageRead.model_validate(message)
