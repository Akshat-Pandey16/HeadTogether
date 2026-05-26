from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.room import Room
    from app.models.user import User


class Message(Base, IdMixin, TimestampMixin):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_room_created", "room_id", "created_at"),
        Index("ix_messages_sender", "sender_id"),
    )

    room_id: Mapped[UUID] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    sender_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(String(4000))

    room: Mapped[Room] = relationship(back_populates="messages", init=False)
    sender: Mapped[User] = relationship(back_populates="messages", init=False)
