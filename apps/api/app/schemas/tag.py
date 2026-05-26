from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

TagSlug = Annotated[str, Field(min_length=1, max_length=40, strip_whitespace=True)]


class TagRead(ORMModel):
    id: UUID
    slug: str
    label: str


class TagAssignRequest(BaseModel):
    slugs: list[TagSlug] = Field(default_factory=list, max_length=20)


class TagCreate(BaseModel):
    label: TagSlug


class TagWithStats(ORMModel):
    id: UUID
    slug: str
    label: str
    created_at: datetime
