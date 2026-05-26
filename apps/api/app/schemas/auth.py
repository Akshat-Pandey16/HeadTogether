from __future__ import annotations

from pydantic import BaseModel, EmailStr

from app.schemas.user import PasswordStr


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: PasswordStr
    new_password: PasswordStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: PasswordStr


class GenericMessage(BaseModel):
    message: str
