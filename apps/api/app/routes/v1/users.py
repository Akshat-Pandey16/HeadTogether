from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, status

from app.deps import CurrentUser, UserServiceDep
from app.schemas.tag import TagAssignRequest, TagRead
from app.schemas.user import UserProfile, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate, current_user: CurrentUser, users: UserServiceDep
) -> UserRead:
    updated = await users.update_profile(user=current_user, payload=payload)
    return UserRead.model_validate(updated)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(current_user: CurrentUser, users: UserServiceDep) -> None:
    await users.soft_delete(user=current_user)


@router.get("/me/tags", response_model=list[TagRead])
async def list_my_tags(current_user: CurrentUser, users: UserServiceDep) -> list[TagRead]:
    tags = await users.list_my_tags(user_id=current_user.id)
    return [TagRead.model_validate(t) for t in tags]


@router.put("/me/tags", response_model=list[TagRead])
async def set_my_tags(
    payload: TagAssignRequest,
    current_user: CurrentUser,
    users: UserServiceDep,
) -> list[TagRead]:
    tags = await users.set_my_tags(user_id=current_user.id, labels=payload.slugs)
    return [TagRead.model_validate(t) for t in tags]


@router.get("/{user_id}", response_model=UserProfile)
async def get_user_profile(
    user_id: UUID, current_user: CurrentUser, users: UserServiceDep
) -> UserProfile:
    _ = current_user
    user = await users.get_public_profile(user_id=user_id)
    tags = await users.list_my_tags(user_id=user.id)
    return UserProfile(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        gender=user.gender,
        age=user.age,
        avatar_url=user.avatar_url,
        bio=user.bio,
        tags=[TagRead.model_validate(t) for t in tags],
    )
