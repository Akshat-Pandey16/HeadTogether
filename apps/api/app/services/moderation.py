from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.enums import ReportTarget
from app.models.moderation import Block, Report
from app.models.user import User
from app.repositories.message import MessageRepository
from app.repositories.moderation import BlockRepository, ReportRepository
from app.repositories.room import RoomRepository
from app.repositories.user import UserRepository
from app.schemas.moderation import ReportCreate


class ModerationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.blocks = BlockRepository(session)
        self.reports = ReportRepository(session)
        self.users = UserRepository(session)
        self.rooms = RoomRepository(session)
        self.messages = MessageRepository(session)

    async def block(self, *, actor_id: UUID, target_id: UUID) -> Block:
        if actor_id == target_id:
            raise ValidationError("Cannot block yourself", code="cannot_block_self")
        if await self.users.get(target_id) is None:
            raise NotFoundError("User not found", code="user_not_found")
        existing = await self.blocks.get(actor_id, target_id)
        if existing is not None:
            return existing
        block = Block(actor_user_id=actor_id, target_user_id=target_id)
        try:
            await self.blocks.add(block)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raced = await self.blocks.get(actor_id, target_id)
            if raced is not None:
                return raced
            raise
        return block

    async def unblock(self, *, actor_id: UUID, target_id: UUID) -> None:
        await self.blocks.delete_by(actor_user_id=actor_id, target_user_id=target_id)
        await self.session.commit()

    async def list_blocked(self, *, actor_id: UUID) -> list[Block]:
        return await self.blocks.list(actor_user_id=actor_id, limit=200, offset=0)

    async def list_blocked_users(self, *, actor_id: UUID) -> list[User]:
        target_ids = await self.blocks.blocked_by(actor_id)
        return await self.users.list_by_ids(target_ids)

    async def report(self, *, reporter_id: UUID, payload: ReportCreate) -> Report:
        await self._ensure_target_exists(payload)
        if payload.target_type == ReportTarget.USER and payload.target_id == reporter_id:
            raise ConflictError("Cannot report yourself", code="cannot_report_self")
        report = Report(
            reporter_id=reporter_id,
            target_type=payload.target_type,
            target_id=payload.target_id,
            reason=payload.reason,
            description=payload.description,
        )
        await self.reports.add(report)
        await self.session.commit()
        return report

    async def _ensure_target_exists(self, payload: ReportCreate) -> None:
        if (
            payload.target_type == ReportTarget.USER
            and await self.users.get(payload.target_id) is None
        ):
            raise NotFoundError("User not found", code="user_not_found")
        if (
            payload.target_type == ReportTarget.ROOM
            and await self.rooms.get_any(payload.target_id) is None
        ):
            raise NotFoundError("Room not found", code="room_not_found")
        if (
            payload.target_type == ReportTarget.MESSAGE
            and await self.messages.get(payload.target_id) is None
        ):
            raise NotFoundError("Message not found", code="message_not_found")
