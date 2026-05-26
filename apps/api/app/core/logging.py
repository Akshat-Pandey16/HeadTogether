from __future__ import annotations

import logging
import sys
from typing import Any

import structlog

from app.core.config import settings

_NOISY_LOGGERS = ("uvicorn.access", "sqlalchemy.engine.Engine", "watchfiles.main")


def configure_logging() -> None:
    timestamper = structlog.processors.TimeStamper(fmt="%H:%M:%S", utc=False)

    pre_chain: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.ExtraAdder(),
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer()
        if settings.log_json
        else structlog.dev.ConsoleRenderer(
            colors=True,
            event_key="event",
            timestamp_key="timestamp",
            pad_event=28,
            exception_formatter=structlog.dev.RichTracebackFormatter(
                show_locals=False, width=120, max_frames=8
            ),
        )
    )

    structlog.configure(
        processors=[
            *pre_chain,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=pre_chain,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level)

    for name in _NOISY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> Any:
    return structlog.get_logger(name)
