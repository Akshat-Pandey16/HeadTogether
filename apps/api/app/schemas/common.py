from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("*", mode="before")
    @classmethod
    def _ensure_utc_datetimes(cls, value: Any) -> Any:
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class PageParams(BaseModel):
    limit: Annotated[int, Field(ge=1, le=100)] = 50
    offset: Annotated[int, Field(ge=0)] = 0


class Page[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: dict[str, object] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    version: str


class GenericMessage(BaseModel):
    message: str
