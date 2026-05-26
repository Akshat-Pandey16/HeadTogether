from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin, enum_column
from app.models.enums import MessageType

if TYPE_CHECKING:
    from app.models.room import Room
    from app.models.user import User


class Message(Base, IdMixin, TimestampMixin):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_room_created", "room_id", "created_at"),
        Index("ix_messages_room_id_created", "room_id", "id", "created_at"),
        Index("ix_messages_sender", "sender_id"),
        Index("ix_messages_pinned", "room_id", "pinned_at"),
        Index(
            "ix_messages_idempotency",
            "room_id",
            "sender_id",
            "client_message_id",
            unique=True,
            sqlite_where=None,
        ),
    )

    room_id: Mapped[UUID] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    sender_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(String(4000))
    message_type: Mapped[MessageType] = mapped_column(
        enum_column(MessageType), default=MessageType.TEXT
    )
    client_message_id: Mapped[str | None] = mapped_column(String(64), default=None)
    parent_message_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), default=None
    )
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    pinned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    pinned_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )

    room: Mapped[Room] = relationship(back_populates="messages", init=False)
    sender: Mapped[User] = relationship(
        back_populates="messages", init=False, foreign_keys=[sender_id]
    )
    reactions: Mapped[list[MessageReaction]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
        default_factory=list,
        init=False,
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @property
    def is_pinned(self) -> bool:
        return self.pinned_at is not None


class MessageReaction(Base):
    __tablename__ = "message_reactions"
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_message_reactions"),
        Index("ix_message_reactions_user", "user_id"),
    )

    message_id: Mapped[UUID] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    emoji: Mapped[str] = mapped_column(String(16), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    message: Mapped[Message] = relationship(back_populates="reactions", init=False)


class RoomReadState(Base):
    __tablename__ = "room_read_states"

    room_id: Mapped[UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    last_read_message_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"), default=None
    )
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
