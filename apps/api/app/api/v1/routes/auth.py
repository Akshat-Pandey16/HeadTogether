from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import AuthServiceDep
from app.schemas.auth import TokenPair, TokenRefreshRequest
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, auth: AuthServiceDep) -> UserRead:
    user = await auth.register(payload)
    return UserRead.model_validate(user)


@router.post("/login", response_model=TokenPair)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    auth: AuthServiceDep,
) -> TokenPair:
    return await auth.login(form.username, form.password)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: TokenRefreshRequest, auth: AuthServiceDep) -> TokenPair:
    return await auth.refresh(payload.refresh_token)
