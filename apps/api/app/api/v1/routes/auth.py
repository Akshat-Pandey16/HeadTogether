from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import AuthServiceDep, ClientInfoDep, CurrentUser, PasswordResetServiceDep
from app.core.config import settings
from app.core.rate_limit import limiter
from app.schemas.auth import (
    ForgotPasswordRequest,
    LogoutRequest,
    PasswordChangeRequest,
    ResetPasswordRequest,
    TokenPair,
    TokenRefreshRequest,
)
from app.schemas.common import GenericMessage
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.rate_limit_register)
async def register(
    request: Request,
    payload: UserCreate,
    auth: AuthServiceDep,
    client: ClientInfoDep,
) -> UserRead:
    _ = request
    user = await auth.register(payload, client=client)
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenPair)
@limiter.limit(settings.rate_limit_login)
async def login(
    request: Request,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    auth: AuthServiceDep,
    client: ClientInfoDep,
) -> TokenPair:
    _ = request
    return await auth.login(email=form.username, password=form.password, client=client)


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    payload: TokenRefreshRequest,
    auth: AuthServiceDep,
    client: ClientInfoDep,
) -> TokenPair:
    return await auth.refresh(refresh_token=payload.refresh_token, client=client)


@router.post("/logout", response_model=GenericMessage)
async def logout(payload: LogoutRequest, auth: AuthServiceDep) -> GenericMessage:
    await auth.logout(refresh_token=payload.refresh_token)
    return GenericMessage(message="logged_out")


@router.post("/logout-all", response_model=GenericMessage)
async def logout_all(current_user: CurrentUser, auth: AuthServiceDep) -> GenericMessage:
    revoked = await auth.logout_all(user_id=current_user.id)
    return GenericMessage(message=f"revoked_{revoked}_sessions")


@router.post("/change-password", response_model=GenericMessage)
async def change_password(
    payload: PasswordChangeRequest,
    current_user: CurrentUser,
    auth: AuthServiceDep,
) -> GenericMessage:
    await auth.change_password(
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return GenericMessage(message="password_changed")


@router.post("/forgot-password", response_model=GenericMessage)
@limiter.limit(settings.rate_limit_forgot_password)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    resets: PasswordResetServiceDep,
) -> GenericMessage:
    _ = request
    await resets.request_reset(email=payload.email)
    return GenericMessage(message="if_account_exists_email_sent")


@router.post("/reset-password", response_model=GenericMessage)
async def reset_password(
    payload: ResetPasswordRequest,
    resets: PasswordResetServiceDep,
) -> GenericMessage:
    await resets.reset(token=payload.token, new_password=payload.new_password)
    return GenericMessage(message="password_reset")
