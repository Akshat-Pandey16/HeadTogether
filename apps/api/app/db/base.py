from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, MappedAsDataclass, mapped_column

from app.utils.time import utc_now


def enum_column(enum_cls: type[Enum]) -> SAEnum:
    return SAEnum(
        enum_cls,
        values_callable=lambda e: [m.value for m in e],
        native_enum=False,
        length=32,
    )


class Base(MappedAsDataclass, DeclarativeBase, kw_only=True):
    pass


class IdMixin(MappedAsDataclass):
    id: Mapped[UUID] = mapped_column(primary_key=True, default_factory=uuid4, init=False)


class TimestampMixin(MappedAsDataclass):
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default_factory=utc_now,
        server_default=func.now(),
        init=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default_factory=utc_now,
        server_default=func.now(),
        onupdate=func.now(),
        init=False,
    )
