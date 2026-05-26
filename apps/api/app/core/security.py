from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any, Final
from uuid import uuid4

import jwt
from pwdlib import PasswordHash
from zxcvbn import zxcvbn

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ValidationError

_password_hasher: Final[PasswordHash] = PasswordHash.recommended()
_OPAQUE_TOKEN_BYTES: Final[int] = 32


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


@dataclass(frozen=True, slots=True)
class IssuedJWT:
    token: str
    jti: str
    issued_at: datetime
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class OpaqueToken:
    raw: str
    hashed: str


def hash_password(plain_password: str) -> str:
    return _password_hasher.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _password_hasher.verify(plain_password, hashed_password)


def verify_and_update_password(
    plain_password: str, hashed_password: str
) -> tuple[bool, str | None]:
    return _password_hasher.verify_and_update(plain_password, hashed_password)


def assess_password_strength(
    password: str,
    *,
    user_inputs: list[str] | None = None,
) -> tuple[int, list[str]]:
    result = zxcvbn(password, user_inputs=user_inputs or [])
    score = int(result["score"])
    feedback = result.get("feedback", {})
    warnings = [feedback["warning"]] if feedback.get("warning") else []
    warnings.extend(feedback.get("suggestions", []))
    return score, warnings


def ensure_password_strength(
    password: str,
    *,
    user_inputs: list[str] | None = None,
) -> None:
    score, feedback = assess_password_strength(password, user_inputs=user_inputs)
    if score < settings.password_min_zxcvbn_score:
        raise ValidationError(
            "Password is too weak",
            code="password_too_weak",
            details={
                "score": score,
                "minimum": settings.password_min_zxcvbn_score,
                "feedback": feedback,
            },
        )


def generate_opaque_token() -> OpaqueToken:
    raw = secrets.token_urlsafe(_OPAQUE_TOKEN_BYTES)
    return OpaqueToken(raw=raw, hashed=hash_opaque_token(raw))


def hash_opaque_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


def _encode_jwt(
    *,
    subject: str,
    token_type: TokenType,
    ttl: timedelta,
    jti: str | None = None,
    extra: dict[str, Any] | None = None,
) -> IssuedJWT:
    now = datetime.now(UTC)
    expires_at = now + ttl
    token_jti = jti or uuid4().hex
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type.value,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": token_jti,
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )
    return IssuedJWT(token=token, jti=token_jti, issued_at=now, expires_at=expires_at)


def create_access_token(subject: str) -> IssuedJWT:
    return _encode_jwt(
        subject=subject,
        token_type=TokenType.ACCESS,
        ttl=timedelta(minutes=settings.jwt_access_token_ttl_minutes),
    )


def create_refresh_token(
    subject: str,
    *,
    family_id: str,
    jti: str | None = None,
) -> IssuedJWT:
    return _encode_jwt(
        subject=subject,
        token_type=TokenType.REFRESH,
        ttl=timedelta(days=settings.jwt_refresh_token_ttl_days),
        jti=jti,
        extra={"fam": family_id},
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
