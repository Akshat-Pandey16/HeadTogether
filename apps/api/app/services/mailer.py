from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class Mailer:
    async def send_password_reset(self, *, email: str, token: str) -> None:
        link = f"{settings.public_app_url}/auth/reset-password?token={token}"
        log.info("mail.password_reset", to=email, link=link)

    async def send_email_verification(self, *, email: str, token: str) -> None:
        link = f"{settings.public_app_url}/auth/verify-email?token={token}"
        log.info("mail.email_verification", to=email, link=link)
