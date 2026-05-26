from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import MessageType
from app.schemas.common import ORMModel
from app.schemas.user import UserPublic

MessageBody = Annotated[str, Field(min_length=1, max_length=4000, strip_whitespace=True)]
Emoji = Annotated[str, Field(min_length=1, max_length=16, strip_whitespace=True)]
ClientMessageId = Annotated[str, Field(min_length=1, max_length=64, strip_whitespace=True)]


class ReactionSummary(BaseModel):
    emoji: str
    count: int
    reacted_by_me: bool


class MessageRead(ORMModel):
    id: UUID
    room_id: UUID
    sender: UserPublic
    body: str
    message_type: MessageType
    parent_message_id: UUID | None
    client_message_id: str | None
    edited_at: datetime | None
    deleted_at: datetime | None
    pinned_at: datetime | None
    reactions: list[ReactionSummary] = Field(default_factory=list)
    created_at: datetime


class MessageCreate(BaseModel):
    body: MessageBody
    parent_message_id: UUID | None = None
    client_message_id: ClientMessageId | None = None


class MessageEdit(BaseModel):
    body: MessageBody


class ReactionCreate(BaseModel):
    emoji: Emoji


class MarkReadRequest(BaseModel):
    up_to_message_id: UUID


class UnreadResponse(BaseModel):
    count: int
    last_read_message_id: UUID | None
    last_read_at: datetime | None
