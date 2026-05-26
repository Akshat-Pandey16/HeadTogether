from __future__ import annotations

from datetime import timedelta
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
)
from app.core.logging import get_logger
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    ensure_password_strength,
    hash_password,
    verify_and_update_password,
)
from app.models.auth import LoginAttempt, RefreshToken
from app.models.user import User
from app.repositories.auth import (
    LoginAttemptRepository,
    PasswordResetTokenRepository,
    RefreshTokenRepository,
)
from app.repositories.user import UserRepository
from app.schemas.auth import TokenPair
from app.schemas.user import UserCreate
from app.utils.request import ClientInfo
from app.utils.time import ensure_utc, utc_now

log = get_logger(__name__)


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)
        self.password_resets = PasswordResetTokenRepository(session)
        self.login_attempts = LoginAttemptRepository(session)

    async def register(
        self,
        payload: UserCreate,
        *,
        client: ClientInfo,
    ) -> User:
        email = payload.email.lower().strip()
        ensure_password_strength(
            payload.password,
            user_inputs=[email, payload.first_name, payload.last_name],
        )
        if await self.users.exists(email=email):
            raise ConflictError("Email already registered", code="email_taken")
        user = User(
            email=email,
            hashed_password=hash_password(payload.password),
            first_name=payload.first_name,
            last_name=payload.last_name,
            gender=payload.gender,
            age=payload.age,
        )
        await self.users.add(user)
        await self.session.commit()
        log.info("auth.register", user_id=str(user.id), email=user.email, ip=client.ip)
        return user

    async def login(
        self,
        *,
        email: str,
        password: str,
        client: ClientInfo,
    ) -> TokenPair:
        normalized = email.lower().strip()
        user = await self.users.get_by_email(normalized)
        if user is None:
            await self._record_attempt(
                user=None, email=normalized, success=False, reason="user_not_found", client=client
            )
            raise AuthenticationError("Invalid credentials", code="invalid_credentials")

        now = utc_now()
        locked_until = ensure_utc(user.locked_until)
        if locked_until is not None and locked_until > now:
            await self._record_attempt(
                user=user, email=normalized, success=False, reason="locked", client=client
            )
            raise AuthenticationError("Account is temporarily locked", code="account_locked")

        valid, new_hash = verify_and_update_password(password, user.hashed_password)
        if not valid:
            await self._register_failure(user=user, client=client, reason="bad_password")
            await self.session.commit()
            raise AuthenticationError("Invalid credentials", code="invalid_credentials")

        if not user.is_active:
            await self._record_attempt(
                user=user, email=normalized, success=False, reason="inactive", client=client
            )
            await self.session.commit()
            raise AuthenticationError("Account is disabled", code="account_disabled")

        user.failed_login_count = 0
        user.locked_until = None
        user.last_login_at = now
        user.last_login_ip = client.ip
        if new_hash is not None:
            user.hashed_password = new_hash

        pair, _ = await self._issue_token_pair(user=user, client=client, family_id=None)
        await self._record_attempt(
            user=user, email=normalized, success=True, reason=None, client=client
        )
        await self.session.commit()
        return pair

    async def refresh(
        self,
        *,
        refresh_token: str,
        client: ClientInfo,
    ) -> TokenPair:
        payload = decode_token(refresh_token, TokenType.REFRESH)
        jti = payload["jti"]
        user_id = UUID(payload["sub"])
        family_id = UUID(payload["fam"])

        stored = await self.refresh_tokens.get_by_jti(jti)
        if stored is None:
            await self.refresh_tokens.revoke_family(family_id, utc_now())
            await self.session.commit()
            raise AuthenticationError("Refresh token not recognized", code="invalid_refresh_token")
        if stored.is_revoked or stored.replaced_by_jti is not None:
            await self.refresh_tokens.revoke_family(family_id, utc_now())
            await self.session.commit()
            log.warning(
                "auth.refresh.reuse_detected",
                user_id=str(user_id),
                family_id=str(family_id),
                ip=client.ip,
            )
            raise AuthenticationError("Refresh token reuse detected", code="refresh_token_reused")

        user = await self.users.get(user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User no longer valid", code="invalid_user")

        now = utc_now()
        pair, new_jti = await self._issue_token_pair(user=user, client=client, family_id=family_id)
        stored.revoked_at = now
        stored.replaced_by_jti = new_jti
        await self.session.commit()
        return pair

    async def logout(self, *, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token, TokenType.REFRESH)
        except AuthenticationError:
            return
        stored = await self.refresh_tokens.get_by_jti(payload["jti"])
        if stored is None or stored.is_revoked:
            return
        stored.revoked_at = utc_now()
        await self.session.commit()

    async def logout_all(self, *, user_id: UUID) -> int:
        revoked = await self.refresh_tokens.revoke_all_for_user(user_id, utc_now())
        await self.session.commit()
        return revoked

    async def change_password(
        self,
        *,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        valid, _ = verify_and_update_password(current_password, user.hashed_password)
        if not valid:
            raise AuthorizationError(
                "Current password is incorrect", code="invalid_current_password"
            )
        ensure_password_strength(
            new_password, user_inputs=[user.email, user.first_name, user.last_name]
        )
        user.hashed_password = hash_password(new_password)
        await self.refresh_tokens.revoke_all_for_user(user.id, utc_now())
        await self.session.commit()

    async def get_current_user(self, access_token: str) -> User:
        payload = decode_token(access_token, TokenType.ACCESS)
        user = await self.users.get(UUID(payload["sub"]))
        if user is None:
            raise NotFoundError("User not found", code="user_not_found")
        if not user.is_active:
            raise AuthenticationError("Account is disabled", code="account_disabled")
        return user

    async def _issue_token_pair(
        self,
        *,
        user: User,
        client: ClientInfo,
        family_id: UUID | None,
    ) -> tuple[TokenPair, str]:
        access = create_access_token(str(user.id))
        family = family_id or uuid4()
        refresh = create_refresh_token(str(user.id), family_id=str(family))
        await self.refresh_tokens.add(
            RefreshToken(
                user_id=user.id,
                jti=refresh.jti,
                family_id=family,
                issued_at=refresh.issued_at,
                expires_at=refresh.expires_at,
                user_agent=client.user_agent,
                ip=client.ip,
            )
        )
        pair = TokenPair(
            access_token=access.token,
            refresh_token=refresh.token,
            expires_in=settings.jwt_access_token_ttl_minutes * 60,
        )
        return pair, refresh.jti

    async def _register_failure(
        self,
        *,
        user: User,
        client: ClientInfo,
        reason: str,
    ) -> None:
        user.failed_login_count += 1
        if user.failed_login_count >= settings.login_max_failed_attempts:
            user.locked_until = utc_now() + timedelta(
                minutes=settings.login_lockout_minutes
            )
            log.warning(
                "auth.lockout",
                user_id=str(user.id),
                until=user.locked_until.isoformat(),
                ip=client.ip,
            )
        await self._record_attempt(
            user=user, email=user.email, success=False, reason=reason, client=client
        )

    async def _record_attempt(
        self,
        *,
        user: User | None,
        email: str,
        success: bool,
        reason: str | None,
        client: ClientInfo,
    ) -> None:
        await self.login_attempts.add(
            LoginAttempt(
                email=email,
                attempted_at=utc_now(),
                success=success,
                user_id=user.id if user is not None else None,
                ip=client.ip,
                user_agent=client.user_agent,
                reason=reason,
            )
        )
