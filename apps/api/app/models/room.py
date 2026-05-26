from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin, enum_column
from app.models.enums import (
    MembershipState,
    RoomEventType,
    RoomPurpose,
    RoomRole,
    RoomStatus,
    RoomVisibility,
)

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.tag import RoomTag
    from app.models.user import User


class Room(Base, IdMixin, TimestampMixin):
    __tablename__ = "rooms"
    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_rooms_latitude"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_rooms_longitude"),
        CheckConstraint("radius_km > 0 AND radius_km <= 200", name="ck_rooms_radius"),
        CheckConstraint("max_members > 0 AND max_members <= 500", name="ck_rooms_max_members"),
        Index("ix_rooms_owner", "owner_id"),
        Index("ix_rooms_status_visibility_geo", "status", "visibility", "latitude", "longitude"),
        Index("ix_rooms_invite_code", "invite_code", unique=True),
        Index("ix_rooms_starts_at", "starts_at"),
        Index("ix_rooms_ends_at", "ends_at"),
    )

    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    purpose: Mapped[RoomPurpose] = mapped_column(enum_column(RoomPurpose))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    radius_km: Mapped[float] = mapped_column(Float)
    custom_purpose: Mapped[str | None] = mapped_column(String(60), default=None)
    max_members: Mapped[int] = mapped_column(SmallInteger, default=50)
    visibility: Mapped[RoomVisibility] = mapped_column(
        enum_column(RoomVisibility), default=RoomVisibility.PUBLIC
    )
    status: Mapped[RoomStatus] = mapped_column(enum_column(RoomStatus), default=RoomStatus.ACTIVE)
    invite_code: Mapped[str | None] = mapped_column(String(24), default=None)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    cover_photo_url: Mapped[str | None] = mapped_column(String(500), default=None)
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    restore_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    owner: Mapped[User] = relationship(back_populates="owned_rooms", init=False)
    members: Mapped[list[RoomMember]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    details: Mapped[list[RoomDetail]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    messages: Mapped[list[Message]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    tags: Mapped[list[RoomTag]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    events: Mapped[list[RoomEvent]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )


class RoomMember(Base, TimestampMixin):
    __tablename__ = "room_members"
    __table_args__ = (
        Index("ix_room_members_user", "user_id"),
        Index("ix_room_members_state", "room_id", "state"),
    )

    room_id: Mapped[UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[RoomRole] = mapped_column(enum_column(RoomRole), default=RoomRole.MEMBER)
    state: Mapped[MembershipState] = mapped_column(
        enum_column(MembershipState), default=MembershipState.ACTIVE
    )

    room: Mapped[Room] = relationship(back_populates="members", init=False)
    user: Mapped[User] = relationship(back_populates="memberships", init=False)


class RoomDetail(Base, IdMixin, TimestampMixin):
    __tablename__ = "room_details"
    __table_args__ = (Index("ix_room_details_room", "room_id"),)

    room_id: Mapped[UUID] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    heading: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(String(2000))

    room: Mapped[Room] = relationship(back_populates="details", init=False)


class SavedRoom(Base, TimestampMixin):
    __tablename__ = "saved_rooms"
    __table_args__ = (Index("ix_saved_rooms_user", "user_id"),)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    room_id: Mapped[UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True
    )


class RoomEvent(Base, IdMixin):
    __tablename__ = "room_events"
    __table_args__ = (
        Index("ix_room_events_room_created", "room_id", "created_at"),
        Index("ix_room_events_type", "event_type"),
    )

    room_id: Mapped[UUID] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    event_type: Mapped[RoomEventType] = mapped_column(enum_column(RoomEventType))
    actor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    target_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    payload: Mapped[str | None] = mapped_column(String(2000), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )

    room: Mapped[Room] = relationship(back_populates="events", init=False)
