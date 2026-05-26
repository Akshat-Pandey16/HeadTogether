from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.user import UserPublic

MessageBody = Annotated[str, Field(min_length=1, max_length=4000, strip_whitespace=True)]


class MessageCreate(BaseModel):
    body: MessageBody


class MessageRead(ORMModel):
    id: UUID
    room_id: UUID
    sender: UserPublic
    body: str
    created_at: datetime
