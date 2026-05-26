from __future__ import annotations

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.core.logging import get_logger
from app.core.security import (
    ensure_password_strength,
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
)
from app.models.auth import PasswordResetToken
from app.models.user import User
from app.repositories.auth import PasswordResetTokenRepository, RefreshTokenRepository
from app.repositories.user import UserRepository
from app.services.mailer import Mailer
from app.utils.time import utc_now

log = get_logger(__name__)


class PasswordResetService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.tokens = PasswordResetTokenRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)
        self.mailer = Mailer()

    async def request_reset(self, *, email: str) -> None:
        normalized = email.lower().strip()
        user = await self.users.get_by_email(normalized)
        if user is None or not user.is_active:
            log.info("auth.forgot_password.unknown_email", email=normalized)
            return
        now = utc_now()
        await self.tokens.invalidate_all_for_user(user.id, now)
        opaque = generate_opaque_token()
        await self.tokens.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=opaque.hashed,
                issued_at=now,
                expires_at=now + timedelta(minutes=settings.password_reset_token_ttl_minutes),
            )
        )
        await self.session.commit()
        await self.mailer.send_password_reset(email=user.email, token=opaque.raw)

    async def reset(self, *, token: str, new_password: str) -> User:
        now = utc_now()
        record = await self.tokens.get_active_by_hash(hash_opaque_token(token), now)
        if record is None:
            raise AuthenticationError(
                "Reset token is invalid or expired", code="invalid_reset_token"
            )
        user = await self.users.get(record.user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User no longer valid", code="invalid_user")
        ensure_password_strength(
            new_password, user_inputs=[user.email, user.first_name, user.last_name]
        )
        user.hashed_password = hash_password(new_password)
        user.failed_login_count = 0
        user.locked_until = None
        record.used_at = now
        await self.refresh_tokens.revoke_all_for_user(user.id, now)
        await self.session.commit()
        return user
