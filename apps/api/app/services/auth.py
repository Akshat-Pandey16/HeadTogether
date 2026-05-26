from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_and_update_password,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import TokenPair
from app.schemas.user import UserCreate


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def register(self, payload: UserCreate) -> User:
        email = payload.email.lower().strip()
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
        return user

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email)
        if user is None:
            raise AuthenticationError("Invalid credentials", code="invalid_credentials")
        valid, new_hash = verify_and_update_password(password, user.hashed_password)
        if not valid:
            raise AuthenticationError("Invalid credentials", code="invalid_credentials")
        if not user.is_active:
            raise AuthenticationError("Account is disabled", code="account_disabled")
        if new_hash is not None:
            user.hashed_password = new_hash
            await self.session.commit()
        return user

    async def login(self, email: str, password: str) -> TokenPair:
        user = await self.authenticate(email, password)
        return self._issue_tokens(user.id)

    async def refresh(self, refresh_token: str) -> TokenPair:
        payload = decode_token(refresh_token, TokenType.REFRESH)
        user_id = UUID(payload["sub"])
        user = await self.users.get(user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("User no longer valid", code="invalid_user")
        return self._issue_tokens(user.id)

    async def get_current_user(self, access_token: str) -> User:
        payload = decode_token(access_token, TokenType.ACCESS)
        user = await self.users.get(UUID(payload["sub"]))
        if user is None:
            raise NotFoundError("User not found", code="user_not_found")
        if not user.is_active:
            raise AuthenticationError("Account is disabled", code="account_disabled")
        return user

    @staticmethod
    def _issue_tokens(user_id: UUID) -> TokenPair:
        subject = str(user_id)
        return TokenPair(
            access_token=create_access_token(subject),
            refresh_token=create_refresh_token(subject),
        )
