from __future__ import annotations

import asyncio
import signal
from contextlib import suppress

from app.core.logging import configure_logging, get_logger
from app.db.session import engine
from app.jobs.scheduler import build_scheduler

configure_logging()
log = get_logger(__name__)


async def main() -> None:
    scheduler = build_scheduler()
    scheduler.start()
    log.info(
        "scheduler.started",
        jobs=[j.id for j in scheduler.get_jobs()],
    )

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with suppress(NotImplementedError):
            loop.add_signal_handler(sig, stop.set)

    try:
        await stop.wait()
    finally:
        scheduler.shutdown(wait=False)
        await engine.dispose()
        log.info("scheduler.stopped")


if __name__ == "__main__":
    asyncio.run(main())
