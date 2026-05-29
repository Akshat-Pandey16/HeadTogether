from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, status

from app.deps import CurrentUser, ModerationServiceDep
from app.schemas.common import GenericMessage
from app.schemas.moderation import BlockRequest, ReportCreate, ReportRead
from app.schemas.user import UserPublic

router = APIRouter(prefix="/moderation", tags=["moderation"])


@router.get("/blocks", response_model=list[UserPublic])
async def list_blocked_users(
    current_user: CurrentUser,
    moderation: ModerationServiceDep,
) -> list[UserPublic]:
    users = await moderation.list_blocked_users(actor_id=current_user.id)
    return [UserPublic.model_validate(u) for u in users]


@router.post("/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    current_user: CurrentUser,
    moderation: ModerationServiceDep,
) -> ReportRead:
    report = await moderation.report(reporter_id=current_user.id, payload=payload)
    return ReportRead.model_validate(report)


@router.post("/blocks", response_model=GenericMessage, status_code=status.HTTP_201_CREATED)
async def block_user(
    payload: BlockRequest,
    current_user: CurrentUser,
    moderation: ModerationServiceDep,
) -> GenericMessage:
    await moderation.block(actor_id=current_user.id, target_id=payload.target_user_id)
    return GenericMessage(message="blocked")


@router.delete("/blocks/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(
    target_user_id: UUID,
    current_user: CurrentUser,
    moderation: ModerationServiceDep,
) -> None:
    await moderation.unblock(actor_id=current_user.id, target_id=target_user_id)
