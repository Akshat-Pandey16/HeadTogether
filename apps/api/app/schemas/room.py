from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import RoomPurpose, RoomRole
from app.schemas.common import ORMModel
from app.schemas.user import UserPublic

Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]
RadiusKm = Annotated[float, Field(gt=0, le=200)]
RoomName = Annotated[str, Field(min_length=1, max_length=120, strip_whitespace=True)]
Heading = Annotated[str, Field(min_length=1, max_length=120, strip_whitespace=True)]
Body = Annotated[str, Field(min_length=1, max_length=2000)]


class RoomCreate(BaseModel):
    name: RoomName
    purpose: RoomPurpose
    latitude: Latitude
    longitude: Longitude
    radius_km: RadiusKm


class RoomUpdate(BaseModel):
    name: RoomName | None = None
    purpose: RoomPurpose | None = None
    radius_km: RadiusKm | None = None
    is_active: bool | None = None


class RoomDetailCreate(BaseModel):
    heading: Heading
    body: Body


class RoomDetailRead(ORMModel):
    id: UUID
    heading: str
    body: str
    created_at: datetime


class RoomRead(ORMModel):
    id: UUID
    owner_id: UUID
    name: str
    purpose: RoomPurpose
    latitude: float
    longitude: float
    radius_km: float
    is_active: bool
    created_at: datetime


class RoomDetailedRead(RoomRead):
    owner: UserPublic
    details: list[RoomDetailRead] = Field(default_factory=list)


class NearbyRoomRead(RoomRead):
    distance_km: float


class RoomMemberRead(ORMModel):
    user: UserPublic
    role: RoomRole


class NearbyQuery(BaseModel):
    latitude: Latitude
    longitude: Longitude
