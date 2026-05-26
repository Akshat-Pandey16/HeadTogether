from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import ReportReason, ReportStatus, ReportTarget
from app.schemas.common import ORMModel

ReportDescription = Annotated[str, Field(max_length=1000, strip_whitespace=True)]


class ReportCreate(BaseModel):
    target_type: ReportTarget
    target_id: UUID
    reason: ReportReason
    description: ReportDescription | None = None


class ReportRead(ORMModel):
    id: UUID
    reporter_id: UUID
    target_type: ReportTarget
    target_id: UUID
    reason: ReportReason
    description: str | None
    status: ReportStatus
    created_at: datetime
    reviewed_at: datetime | None


class BlockRequest(BaseModel):
    target_user_id: UUID


class BlockedUser(ORMModel):
    target_user_id: UUID
    created_at: datetime
