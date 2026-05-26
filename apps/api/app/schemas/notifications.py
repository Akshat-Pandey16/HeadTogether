from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import DevicePlatform, NotificationType
from app.schemas.common import ORMModel

DeviceTokenStr = Annotated[str, Field(min_length=8, max_length=255, strip_whitespace=True)]


class DeviceTokenCreate(BaseModel):
    token: DeviceTokenStr
    platform: DevicePlatform


class DeviceTokenRead(ORMModel):
    id: UUID
    platform: DevicePlatform
    created_at: datetime
    last_seen_at: datetime | None


class NotificationRead(ORMModel):
    id: UUID
    type: NotificationType
    actor_id: UUID | None
    room_id: UUID | None
    message_id: UUID | None
    payload: dict | None
    read_at: datetime | None
    created_at: datetime


class UnreadCountResponse(BaseModel):
    count: int
