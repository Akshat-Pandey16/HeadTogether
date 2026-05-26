from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.enums import NotificationType
from app.models.notifications import DeviceToken, Notification
from app.realtime.broker import get_broker, user_channel
from app.realtime.events import WsEvent
from app.repositories.notifications import DeviceTokenRepository, NotificationRepository
from app.schemas.common import Page
from app.schemas.notifications import DeviceTokenCreate, NotificationRead
from app.utils.time import utc_now

log = get_logger(__name__)


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tokens = DeviceTokenRepository(session)
        self.notifications = NotificationRepository(session)

    async def register_token(self, *, user_id: UUID, payload: DeviceTokenCreate) -> DeviceToken:
        existing = await self.tokens.get_by_token(payload.token)
        now = utc_now()
        if existing is not None:
            existing.user_id = user_id
            existing.platform = payload.platform
            existing.revoked_at = None
            existing.last_seen_at = now
            await self.session.commit()
            return existing
        token = DeviceToken(
            user_id=user_id,
            token=payload.token,
            platform=payload.platform,
            last_seen_at=now,
        )
        await self.tokens.add(token)
        await self.session.commit()
        return token

    async def revoke_token(self, *, user_id: UUID, token: str) -> None:
        record = await self.tokens.get_by_token(token)
        if record is None or record.user_id != user_id:
            return
        record.revoked_at = utc_now()
        await self.session.commit()

    async def list_tokens(self, *, user_id: UUID) -> list[DeviceToken]:
        return await self.tokens.list_for_user(user_id)

    async def notify(
        self,
        *,
        user_id: UUID,
        type: NotificationType,
        actor_id: UUID | None = None,
        room_id: UUID | None = None,
        message_id: UUID | None = None,
        payload: dict | None = None,
    ) -> Notification | None:
        if actor_id is not None and actor_id == user_id:
            return None
        notification = Notification(
            user_id=user_id,
            type=type,
            actor_id=actor_id,
            room_id=room_id,
            message_id=message_id,
            payload=payload,
        )
        await self.notifications.add(notification)
        await self.session.commit()
        await self._publish(notification)
        return notification

    async def list(
        self,
        *,
        user_id: UUID,
        limit: int,
        offset: int,
        unread_only: bool,
    ) -> Page[NotificationRead]:
        items, total = await self.notifications.list_for_user(
            user_id, limit=limit, offset=offset, unread_only=unread_only
        )
        return Page[NotificationRead](
            items=[NotificationRead.model_validate(n) for n in items],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def unread_count(self, *, user_id: UUID) -> int:
        return await self.notifications.unread_count(user_id)

    async def mark_read(self, *, user_id: UUID, notification_id: UUID) -> Notification:
        record = await self.notifications.get(notification_id)
        if record is None or record.user_id != user_id:
            raise NotFoundError("Notification not found", code="notification_not_found")
        if record.read_at is None:
            record.read_at = utc_now()
            await self.session.commit()
        return record

    async def mark_all_read(self, *, user_id: UUID) -> int:
        count = await self.notifications.mark_all_read(user_id, utc_now())
        await self.session.commit()
        return count

    async def _publish(self, notification: Notification) -> None:
        try:
            broker = get_broker()
        except RuntimeError:
            return
        event = {
            "type": WsEvent.NOTIFICATION_CREATED.value,
            "data": NotificationRead.model_validate(notification).model_dump(mode="json"),
        }
        await broker.publish(user_channel(str(notification.user_id)), event)
