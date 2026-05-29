from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import SessionFactory
from app.models.auth import RefreshToken
from app.models.enums import RoomStatus
from app.models.notifications import Notification
from app.models.room import Room
from app.utils.time import utc_now

log = get_logger(__name__)


async def archive_expired_rooms(session: AsyncSession) -> int:
    now = utc_now()
    stmt = select(Room).where(
        Room.status == RoomStatus.ACTIVE,
        ((Room.expires_at.is_not(None)) & (Room.expires_at <= now))
        | ((Room.ends_at.is_not(None)) & (Room.ends_at <= now)),
    )
    result = await session.execute(stmt)
    count = 0
    for room in result.scalars().all():
        room.status = RoomStatus.ARCHIVED
        count += 1
    if count:
        await session.commit()
        log.info("jobs.archive_expired_rooms", archived=count)
    return count


async def hard_delete_old_rooms(session: AsyncSession) -> int:
    now = utc_now()
    stmt = select(Room).where(
        Room.status == RoomStatus.DELETED,
        Room.restore_until.is_not(None),
        Room.restore_until < now,
    )
    result = await session.execute(stmt)
    rooms = list(result.scalars().all())
    for room in rooms:
        await session.delete(room)
    if rooms:
        await session.commit()
        log.info("jobs.hard_delete_old_rooms", deleted=len(rooms))
    return len(rooms)


async def purge_revoked_refresh_tokens(session: AsyncSession) -> int:
    cutoff = utc_now() - timedelta(days=settings.jwt_refresh_token_ttl_days)
    stmt = delete(RefreshToken).where(
        (RefreshToken.revoked_at.is_not(None) & (RefreshToken.revoked_at < cutoff))
        | (RefreshToken.expires_at < cutoff)
    )
    result = await session.execute(stmt)
    deleted = int(result.rowcount or 0)
    if deleted:
        await session.commit()
        log.info("jobs.purge_revoked_refresh_tokens", deleted=deleted)
    return deleted


async def purge_old_notifications(session: AsyncSession) -> int:
    now = utc_now()
    read_cutoff = now - timedelta(days=settings.notification_read_retention_days)
    hard_cutoff = now - timedelta(days=settings.notification_max_retention_days)
    stmt = delete(Notification).where(
        (Notification.read_at.is_not(None) & (Notification.read_at < read_cutoff))
        | (Notification.created_at < hard_cutoff)
    )
    result = await session.execute(stmt)
    deleted = int(result.rowcount or 0)
    if deleted:
        await session.commit()
        log.info("jobs.purge_old_notifications", deleted=deleted)
    return deleted


def _job(
    job_id: str, coro_fn: Callable[[AsyncSession], Awaitable[int]]
) -> Callable[[], Awaitable[None]]:
    async def runner() -> None:
        async with SessionFactory() as session:
            try:
                await coro_fn(session)
            except Exception:
                await session.rollback()
                log.exception("jobs.failure", job=job_id)

    runner.__name__ = job_id
    return runner


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        _job("archive_expired_rooms", archive_expired_rooms),
        "interval",
        minutes=5,
        id="archive_expired_rooms",
        replace_existing=True,
    )
    scheduler.add_job(
        _job("hard_delete_old_rooms", hard_delete_old_rooms),
        "interval",
        hours=1,
        id="hard_delete_old_rooms",
        replace_existing=True,
    )
    scheduler.add_job(
        _job("purge_revoked_refresh_tokens", purge_revoked_refresh_tokens),
        "interval",
        hours=6,
        id="purge_revoked_refresh_tokens",
        replace_existing=True,
    )
    scheduler.add_job(
        _job("purge_old_notifications", purge_old_notifications),
        "interval",
        hours=12,
        id="purge_old_notifications",
        replace_existing=True,
    )
    return scheduler
