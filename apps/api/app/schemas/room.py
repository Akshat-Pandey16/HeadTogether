from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.enums import (
    MembershipState,
    RoomEventType,
    RoomPurpose,
    RoomRole,
    RoomStatus,
    RoomVisibility,
)
from app.schemas.common import ORMModel
from app.schemas.tag import TagRead
from app.schemas.user import UserPublic

Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]
RadiusKm = Annotated[float, Field(gt=0, le=200)]
RoomName = Annotated[str, Field(min_length=1, max_length=120, strip_whitespace=True)]
CustomPurposeStr = Annotated[str, Field(min_length=1, max_length=60, strip_whitespace=True)]
MaxMembers = Annotated[int, Field(ge=2, le=500)]
Heading = Annotated[str, Field(min_length=1, max_length=120, strip_whitespace=True)]
Body = Annotated[str, Field(min_length=1, max_length=2000)]
Description = Annotated[str, Field(max_length=1000, strip_whitespace=True)]
PhotoUrl = Annotated[str, Field(max_length=500)]


class RoomCreate(BaseModel):
    name: RoomName
    purpose: RoomPurpose
    latitude: Latitude
    longitude: Longitude
    radius_km: RadiusKm
    custom_purpose: CustomPurposeStr | None = None
    max_members: MaxMembers = 50
    visibility: RoomVisibility = RoomVisibility.PUBLIC
    expires_at: datetime | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    cover_photo_url: PhotoUrl | None = None
    description: Description | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def _validate(self) -> RoomCreate:
        if self.purpose == RoomPurpose.CUSTOM and not self.custom_purpose:
            raise ValueError("custom_purpose is required when purpose is 'custom'")
        if self.purpose != RoomPurpose.CUSTOM and self.custom_purpose:
            raise ValueError("custom_purpose is only allowed when purpose is 'custom'")
        if self.visibility == RoomVisibility.DM:
            raise ValueError("DM rooms cannot be created via /rooms; use /dms")
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class RoomUpdate(BaseModel):
    name: RoomName | None = None
    radius_km: RadiusKm | None = None
    visibility: RoomVisibility | None = None
    max_members: MaxMembers | None = None
    expires_at: datetime | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    cover_photo_url: PhotoUrl | None = None
    description: Description | None = None


class RoomDetailCreate(BaseModel):
    heading: Heading
    body: Body


class RoomDetailUpdate(BaseModel):
    heading: Heading | None = None
    body: Body | None = None


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
    custom_purpose: str | None
    latitude: float
    longitude: float
    radius_km: float
    visibility: RoomVisibility
    status: RoomStatus
    max_members: int
    expires_at: datetime | None
    starts_at: datetime | None
    ends_at: datetime | None
    cover_photo_url: str | None
    description: str | None
    created_at: datetime


class RoomSummary(RoomRead):
    owner: UserPublic
    member_count: int
    is_member: bool
    is_owner: bool
    is_saved: bool
    role: RoomRole | None
    state: MembershipState | None
    tags: list[TagRead] = Field(default_factory=list)


class RoomDetailed(RoomSummary):
    details: list[RoomDetailRead] = Field(default_factory=list)
    invite_code: str | None = None
    waitlist_count: int = 0


class NearbyRoom(RoomSummary):
    distance_km: float


class RoomMemberRead(ORMModel):
    user: UserPublic
    role: RoomRole
    state: MembershipState


class JoinRoomRequest(BaseModel):
    latitude: Latitude
    longitude: Longitude


class JoinByCodeRequest(BaseModel):
    invite_code: Annotated[str, Field(min_length=4, max_length=24, strip_whitespace=True)]


class TransferOwnershipRequest(BaseModel):
    new_owner_id: UUID


class PromoteRequest(BaseModel):
    user_id: UUID


class InviteCodeResponse(BaseModel):
    invite_code: str


class RoomEventRead(ORMModel):
    id: UUID
    event_type: RoomEventType
    actor_id: UUID | None
    target_user_id: UUID | None
    payload: str | None
    created_at: datetime


NearbySort = Literal["distance", "newest", "members", "starts_at"]
TextSort = Literal["newest", "starts_at"]
