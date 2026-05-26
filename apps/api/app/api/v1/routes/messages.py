from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.api.deps import CurrentUser, MessageServiceDep
from app.api.v1.routes.ws import get_manager
from app.core.config import settings
from app.core.rate_limit import limiter
from app.realtime.events import WsEvent
from app.schemas.common import GenericMessage, Page
from app.schemas.message import (
    MarkReadRequest,
    MessageCreate,
    MessageEdit,
    MessageRead,
    ReactionCreate,
    UnreadResponse,
)

router = APIRouter(prefix="/rooms/{room_id}/messages", tags=["messages"])
read_router = APIRouter(prefix="/rooms/{room_id}", tags=["messages"])


@router.get("", response_model=Page[MessageRead])
async def list_messages(
    room_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    before_id: UUID | None = None,
    after_id: UUID | None = None,
) -> Page[MessageRead]:
    return await messages.list_page(
        room_id=room_id,
        actor_id=current_user.id,
        limit=limit,
        before_id=before_id,
        after_id=after_id,
    )


@router.post("", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.rate_limit_send_message)
async def send_message(
    request: Request,
    room_id: UUID,
    payload: MessageCreate,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> MessageRead:
    _ = request
    message, mentioned, created = await messages.post(
        room_id=room_id, sender_id=current_user.id, payload=payload
    )
    if created:
        data = message.model_dump(mode="json")
        if mentioned:
            data["mentions"] = [str(uid) for uid in mentioned]
        await get_manager().broadcast(
            room_id,
            {"type": WsEvent.MESSAGE_CREATED.value, "data": data},
        )
    return message


@router.patch("/{message_id}", response_model=MessageRead)
async def edit_message(
    room_id: UUID,
    message_id: UUID,
    payload: MessageEdit,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> MessageRead:
    message = await messages.edit(
        room_id=room_id, message_id=message_id, actor_id=current_user.id, payload=payload
    )
    await get_manager().broadcast(
        room_id, {"type": WsEvent.MESSAGE_UPDATED.value, "data": message.model_dump(mode="json")}
    )
    return message


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    room_id: UUID,
    message_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> None:
    mid = await messages.delete(room_id=room_id, message_id=message_id, actor_id=current_user.id)
    await get_manager().broadcast(
        room_id,
        {"type": WsEvent.MESSAGE_DELETED.value, "data": {"id": str(mid)}},
    )


@router.post(
    "/{message_id}/reactions",
    status_code=status.HTTP_201_CREATED,
    response_model=GenericMessage,
)
async def add_reaction(
    room_id: UUID,
    message_id: UUID,
    payload: ReactionCreate,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> GenericMessage:
    await messages.add_reaction(
        room_id=room_id,
        message_id=message_id,
        actor_id=current_user.id,
        payload=payload,
    )
    await get_manager().broadcast(
        room_id,
        {
            "type": WsEvent.REACTION_ADDED.value,
            "data": {
                "message_id": str(message_id),
                "user_id": str(current_user.id),
                "emoji": payload.emoji,
            },
        },
    )
    return GenericMessage(message="reaction_added")


@router.delete("/{message_id}/reactions/{emoji}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction(
    room_id: UUID,
    message_id: UUID,
    emoji: str,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> None:
    removed = await messages.remove_reaction(
        room_id=room_id, message_id=message_id, actor_id=current_user.id, emoji=emoji
    )
    if removed:
        await get_manager().broadcast(
            room_id,
            {
                "type": WsEvent.REACTION_REMOVED.value,
                "data": {
                    "message_id": str(message_id),
                    "user_id": str(current_user.id),
                    "emoji": emoji,
                },
            },
        )


@router.post("/{message_id}/pin", response_model=MessageRead)
async def pin_message(
    room_id: UUID,
    message_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> MessageRead:
    message = await messages.pin(room_id=room_id, message_id=message_id, actor_id=current_user.id)
    await get_manager().broadcast(
        room_id, {"type": WsEvent.MESSAGE_PINNED.value, "data": message.model_dump(mode="json")}
    )
    return message


@router.delete("/{message_id}/pin", status_code=status.HTTP_204_NO_CONTENT)
async def unpin_message(
    room_id: UUID,
    message_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> None:
    mid = await messages.unpin(room_id=room_id, message_id=message_id, actor_id=current_user.id)
    await get_manager().broadcast(
        room_id,
        {"type": WsEvent.MESSAGE_UNPINNED.value, "data": {"id": str(mid)}},
    )


@router.get("/pinned", response_model=list[MessageRead])
async def list_pinned(
    room_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> list[MessageRead]:
    return await messages.list_pinned(room_id=room_id, actor_id=current_user.id)


@router.get("/search", response_model=list[MessageRead])
async def search_messages(
    room_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
    q: Annotated[str, Query(min_length=1, max_length=120)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[MessageRead]:
    return await messages.search(room_id=room_id, actor_id=current_user.id, query=q, limit=limit)


@read_router.post("/read", response_model=GenericMessage)
async def mark_read(
    room_id: UUID,
    payload: MarkReadRequest,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> GenericMessage:
    await messages.mark_read(room_id=room_id, actor_id=current_user.id, payload=payload)
    await get_manager().broadcast(
        room_id,
        {
            "type": WsEvent.READ_UPDATED.value,
            "data": {
                "user_id": str(current_user.id),
                "up_to_message_id": str(payload.up_to_message_id),
            },
        },
    )
    return GenericMessage(message="read")


@read_router.get("/unread", response_model=UnreadResponse)
async def unread(
    room_id: UUID,
    current_user: CurrentUser,
    messages: MessageServiceDep,
) -> UnreadResponse:
    return await messages.unread(room_id=room_id, actor_id=current_user.id)
