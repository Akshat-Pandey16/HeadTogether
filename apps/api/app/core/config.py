from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "HeadTogether"
    app_env: Literal["development", "staging", "production", "test"] = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite+aiosqlite:///./headtogether.db"
    database_echo: bool = False

    jwt_secret_key: SecretStr
    jwt_algorithm: str = "HS256"
    jwt_access_token_ttl_minutes: int = Field(default=30, ge=1)
    jwt_refresh_token_ttl_days: int = Field(default=14, ge=1)

    login_max_failed_attempts: int = Field(default=5, ge=1)
    login_lockout_minutes: int = Field(default=15, ge=1)

    password_reset_token_ttl_minutes: int = Field(default=60, ge=1)

    rate_limit_login: str = "10/minute"
    rate_limit_register: str = "5/minute"
    rate_limit_forgot_password: str = "5/minute"
    rate_limit_send_message: str = "30/minute"

    trusted_proxy_count: int = Field(default=0, ge=0)

    redis_url: str | None = None
    presence_ttl_seconds: int = Field(default=30, ge=5)
    typing_ttl_seconds: int = Field(default=8, ge=2)
    ws_heartbeat_interval_seconds: int = Field(default=20, ge=5)
    ws_max_connections_per_user: int = Field(default=5, ge=1)
    message_edit_window_minutes: int = Field(default=15, ge=1)

    public_app_url: str = "http://localhost:5173"

    cors_allow_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )
    cors_allow_origin_regex: str | None = None

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_json: bool = False

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @model_validator(mode="after")
    def _enforce_production_invariants(self) -> Settings:
        if self.is_production:
            self.app_debug = False
            if not self.redis_url:
                raise ValueError("REDIS_URL is required when APP_ENV=production")
            secret = self.jwt_secret_key.get_secret_value()
            if len(secret) < 32:
                raise ValueError("JWT_SECRET_KEY must be at least 32 characters in production")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
