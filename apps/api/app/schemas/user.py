from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import Gender
from app.schemas.common import ORMModel

PasswordStr = Annotated[str, Field(min_length=8, max_length=128)]
NameStr = Annotated[str, Field(min_length=1, max_length=80, strip_whitespace=True)]
Age = Annotated[int, Field(ge=13, le=120)]


class UserBase(BaseModel):
    email: EmailStr
    first_name: NameStr
    last_name: NameStr
    age: Age
    gender: Gender = Gender.PREFER_NOT_TO_SAY


class UserCreate(UserBase):
    password: PasswordStr


class UserUpdate(BaseModel):
    first_name: NameStr | None = None
    last_name: NameStr | None = None
    age: Age | None = None
    gender: Gender | None = None


class UserRead(ORMModel):
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    gender: Gender
    age: int
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class UserPublic(ORMModel):
    id: UUID
    first_name: str
    last_name: str
    gender: Gender
    age: int
