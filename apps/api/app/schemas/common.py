from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


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
