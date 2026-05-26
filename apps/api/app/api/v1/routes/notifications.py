from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, NotificationServiceDep
from app.schemas.notifications import DeviceTokenCreate, DeviceTokenRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


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
