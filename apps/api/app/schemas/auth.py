from __future__ import annotations

from pydantic import BaseModel

from app.schemas.user import PasswordStr


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: PasswordStr
    new_password: PasswordStr
