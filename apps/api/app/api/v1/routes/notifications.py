from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, NotificationServiceDep
from app.schemas.common import GenericMessage, Page
from app.schemas.notifications import (
    DeviceTokenCreate,
    DeviceTokenRead,
    NotificationRead,
    UnreadCountResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=Page[NotificationRead])
async def list_notifications(
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    unread_only: bool = False,
) -> Page[NotificationRead]:
    return await notifications.list(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: CurrentUser, notifications: NotificationServiceDep
) -> UnreadCountResponse:
    count = await notifications.unread_count(user_id=current_user.id)
    return UnreadCountResponse(count=count)


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def mark_read(
    notification_id: UUID,
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
) -> NotificationRead:
    record = await notifications.mark_read(user_id=current_user.id, notification_id=notification_id)
    return NotificationRead.model_validate(record)


@router.post("/read-all", response_model=GenericMessage)
async def mark_all_read(
    current_user: CurrentUser, notifications: NotificationServiceDep
) -> GenericMessage:
    n = await notifications.mark_all_read(user_id=current_user.id)
    return GenericMessage(message=f"marked_{n}_read")


@router.post(
    "/device-tokens",
    response_model=DeviceTokenRead,
    status_code=status.HTTP_201_CREATED,
)
async def register_device_token(
    payload: DeviceTokenCreate,
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
) -> DeviceTokenRead:
    token = await notifications.register_token(user_id=current_user.id, payload=payload)
    return DeviceTokenRead.model_validate(token)


@router.delete("/device-tokens/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_device_token(
    token: str,
    current_user: CurrentUser,
    notifications: NotificationServiceDep,
) -> None:
    await notifications.revoke_token(user_id=current_user.id, token=token)


@router.get("/device-tokens", response_model=list[DeviceTokenRead])
async def list_device_tokens(
    current_user: CurrentUser, notifications: NotificationServiceDep
) -> list[DeviceTokenRead]:
    tokens = await notifications.list_tokens(user_id=current_user.id)
    return [DeviceTokenRead.model_validate(t) for t in tokens]
