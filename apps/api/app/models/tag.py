from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.room import Room
    from app.models.user import User


class Tag(Base, IdMixin, TimestampMixin):
    __tablename__ = "tags"
    __table_args__ = (Index("ix_tags_slug", "slug", unique=True),)

    slug: Mapped[str] = mapped_column(String(40))
    label: Mapped[str] = mapped_column(String(40))


class UserTag(Base, TimestampMixin):
    __tablename__ = "user_tags"
    __table_args__ = (Index("ix_user_tags_tag", "tag_id"),)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[UUID] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )

    tag: Mapped[Tag] = relationship(init=False)
    user: Mapped[User] = relationship(back_populates="tags", init=False)


class RoomTag(Base, TimestampMixin):
    __tablename__ = "room_tags"
    __table_args__ = (Index("ix_room_tags_tag", "tag_id"),)

    room_id: Mapped[UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[UUID] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )

    tag: Mapped[Tag] = relationship(init=False)
    room: Mapped[Room] = relationship(back_populates="tags", init=False)
