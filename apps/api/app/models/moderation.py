from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdMixin, TimestampMixin, enum_column
from app.models.enums import ReportReason, ReportStatus, ReportTarget

if TYPE_CHECKING:
    from app.models.user import User


class Block(Base, TimestampMixin):
    __tablename__ = "blocks"
    __table_args__ = (Index("ix_blocks_target", "target_user_id"),)

    actor_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    target_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


class Report(Base, IdMixin, TimestampMixin):
    __tablename__ = "reports"
    __table_args__ = (
        Index("ix_reports_target", "target_type", "target_id"),
        Index("ix_reports_reporter", "reporter_id"),
        Index("ix_reports_status", "status"),
    )

    reporter_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    target_type: Mapped[ReportTarget] = mapped_column(enum_column(ReportTarget))
    target_id: Mapped[UUID]
    reason: Mapped[ReportReason] = mapped_column(enum_column(ReportReason))
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
    status: Mapped[ReportStatus] = mapped_column(
        enum_column(ReportStatus), default=ReportStatus.PENDING
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    reviewer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )

    reporter: Mapped[User] = relationship(init=False, foreign_keys=[reporter_id])
    reviewer: Mapped[User | None] = relationship(init=False, foreign_keys=[reviewer_id])
