from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.notifications import DeviceToken
from app.repositories.notifications import DeviceTokenRepository
from app.schemas.notifications import DeviceTokenCreate
from app.utils.time import utc_now

log = get_logger(__name__)


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tokens = DeviceTokenRepository(session)

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

    async def push(self, *, user_id: UUID, title: str, body: str, data: dict) -> int:
        tokens = await self.tokens.list_for_user(user_id)
        for tok in tokens:
            log.info(
                "push.enqueued",
                user_id=str(user_id),
                platform=tok.platform.value,
                title=title,
                body=body,
                data=data,
            )
        return len(tokens)
