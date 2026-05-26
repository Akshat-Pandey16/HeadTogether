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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin, enum_column
from app.models.enums import RoomPurpose, RoomRole, RoomStatus, RoomVisibility

if TYPE_CHECKING:
    from app.models.message import Message
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


class RoomMember(Base):
    __tablename__ = "room_members"
    __table_args__ = (Index("ix_room_members_user", "user_id"),)

    room_id: Mapped[UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[RoomRole] = mapped_column(enum_column(RoomRole), default=RoomRole.MEMBER)

    room: Mapped[Room] = relationship(back_populates="members", init=False)
    user: Mapped[User] = relationship(back_populates="memberships", init=False)


class RoomDetail(Base, IdMixin, TimestampMixin):
    __tablename__ = "room_details"
    __table_args__ = (Index("ix_room_details_room", "room_id"),)

    room_id: Mapped[UUID] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    heading: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(String(2000))

    room: Mapped[Room] = relationship(back_populates="details", init=False)
