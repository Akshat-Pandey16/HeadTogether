from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, UserServiceDep
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    current_user: CurrentUser,
    users: UserServiceDep,
) -> UserRead:
    updated = await users.update_profile(user=current_user, payload=payload)
    return UserRead.model_validate(updated)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(current_user: CurrentUser, users: UserServiceDep) -> None:
    await users.soft_delete(user=current_user)
