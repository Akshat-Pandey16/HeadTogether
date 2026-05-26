from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Index, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin, enum_column
from app.models.enums import Gender

if TYPE_CHECKING:
    from app.models.auth import LoginAttempt, PasswordResetToken, RefreshToken
    from app.models.message import Message
    from app.models.room import Room, RoomMember


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_email", "email", unique=True),)

    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    age: Mapped[int] = mapped_column(SmallInteger)
    gender: Mapped[Gender] = mapped_column(enum_column(Gender), default=Gender.PREFER_NOT_TO_SAY)
    is_active: Mapped[bool] = mapped_column(default=True)
    failed_login_count: Mapped[int] = mapped_column(SmallInteger, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    last_login_ip: Mapped[str | None] = mapped_column(String(45), default=None)

    owned_rooms: Mapped[list[Room]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    memberships: Mapped[list[RoomMember]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    messages: Mapped[list[Message]] = relationship(
        back_populates="sender",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    password_reset_tokens: Mapped[list[PasswordResetToken]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )
    login_attempts: Mapped[list[LoginAttempt]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
