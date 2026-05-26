from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update

from app.models.auth import LoginAttempt, PasswordResetToken, RefreshToken
from app.repositories.base import AsyncRepository


class RefreshTokenRepository(AsyncRepository[RefreshToken]):
    model = RefreshToken

    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        return await self.get_by(jti=jti)

    async def revoke_family(self, family_id: UUID, at: datetime) -> int:
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=at)
        )
        result = await self.session.execute(stmt)
        return result.rowcount or 0

    async def revoke_all_for_user(self, user_id: UUID, at: datetime) -> int:
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=at)
        )
        result = await self.session.execute(stmt)
        return result.rowcount or 0


class PasswordResetTokenRepository(AsyncRepository[PasswordResetToken]):
    model = PasswordResetToken

    async def get_active_by_hash(self, token_hash: str, now: datetime) -> PasswordResetToken | None:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def invalidate_all_for_user(self, user_id: UUID, at: datetime) -> int:
        stmt = (
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=at)
        )
        result = await self.session.execute(stmt)
        return result.rowcount or 0


class LoginAttemptRepository(AsyncRepository[LoginAttempt]):
    model = LoginAttempt
