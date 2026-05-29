from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.user import UserPublic


class CreateDMRequest(BaseModel):
    recipient_user_id: UUID


class DMRead(ORMModel):
    id: UUID
    created_at: datetime
    participants: list[UserPublic] = Field(default_factory=list)
