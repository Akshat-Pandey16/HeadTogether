from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator
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

    password_min_zxcvbn_score: int = Field(default=3, ge=0, le=4)

    login_max_failed_attempts: int = Field(default=5, ge=1)
    login_lockout_minutes: int = Field(default=15, ge=1)

    password_reset_token_ttl_minutes: int = Field(default=60, ge=1)

    rate_limit_login: str = "10/minute"
    rate_limit_register: str = "5/minute"
    rate_limit_forgot_password: str = "5/minute"

    public_app_url: str = "http://localhost:5173"

    cors_allow_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
