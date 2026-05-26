from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select

from app.models.enums import ReportStatus
from app.models.moderation import Block, Report
from app.repositories.base import AsyncRepository


class BlockRepository(AsyncRepository[Block]):
    model = Block

    async def is_blocked(self, *, actor_id: UUID, target_id: UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(Block)
            .where(
                ((Block.actor_user_id == actor_id) & (Block.target_user_id == target_id))
                | ((Block.actor_user_id == target_id) & (Block.target_user_id == actor_id))
            )
        )
        return (await self.session.scalar(stmt) or 0) > 0

    async def blocked_by(self, actor_id: UUID) -> set[UUID]:
        stmt = select(Block.target_user_id).where(Block.actor_user_id == actor_id)
        result = await self.session.execute(stmt)
        return {row[0] for row in result.all()}

    async def blocked_either_way(self, actor_id: UUID) -> set[UUID]:
        stmt = select(Block.target_user_id).where(Block.actor_user_id == actor_id)
        result = await self.session.execute(stmt)
        outgoing = {row[0] for row in result.all()}
        stmt = select(Block.actor_user_id).where(Block.target_user_id == actor_id)
        result = await self.session.execute(stmt)
        incoming = {row[0] for row in result.all()}
        return outgoing | incoming

    async def get(self, actor_id: UUID, target_id: UUID) -> Block | None:  # type: ignore[override]
        return await self.get_by(actor_user_id=actor_id, target_user_id=target_id)


class ReportRepository(AsyncRepository[Report]):
    model = Report

    async def list_pending(self, *, limit: int, offset: int) -> tuple[list[Report], int]:
        base = select(Report).where(Report.status == ReportStatus.PENDING)
        total = await self.session.scalar(select(func.count()).select_from(base.subquery()))
        rows = await self.session.execute(
            base.order_by(Report.created_at.desc()).limit(limit).offset(offset)
        )
        return list(rows.scalars().all()), int(total or 0)
