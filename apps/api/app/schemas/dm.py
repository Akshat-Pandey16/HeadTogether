from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class CreateDMRequest(BaseModel):
    recipient_user_id: UUID
