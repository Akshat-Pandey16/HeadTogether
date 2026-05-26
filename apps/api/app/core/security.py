from __future__ import annotations

from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any, Final
from uuid import uuid4

import jwt
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.exceptions import AuthenticationError

_password_hasher: Final[PasswordHash] = PasswordHash.recommended()


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def hash_password(plain_password: str) -> str:
    return _password_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _password_hasher.verify(plain_password, hashed_password)


def verify_and_update_password(
    plain_password: str, hashed_password: str
) -> tuple[bool, str | None]:
    return _password_hasher.verify_and_update(plain_password, hashed_password)


def _create_token(subject: str, token_type: TokenType, ttl: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type.value,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "jti": uuid4().hex,
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


def create_access_token(subject: str) -> str:
    return _create_token(
        subject,
        TokenType.ACCESS,
        timedelta(minutes=settings.jwt_access_token_ttl_minutes),
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject,
        TokenType.REFRESH,
        timedelta(days=settings.jwt_refresh_token_ttl_days),
    )


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationError("Token has expired", code="token_expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError("Invalid token", code="invalid_token") from exc

    if payload.get("type") != expected_type.value:
        raise AuthenticationError("Wrong token type", code="invalid_token_type")
    if not payload.get("sub"):
        raise AuthenticationError("Token missing subject", code="invalid_token")

    return payload
