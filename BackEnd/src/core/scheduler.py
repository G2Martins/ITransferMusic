"""APScheduler wrapper que dispara o scan de syncs periodicamente."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.core.db import get_database
from src.services.sync_runner import scan_and_run_due_syncs

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _tick() -> None:
    db = get_database()
    await scan_and_run_due_syncs(db)


def start_scheduler() -> None:
    """Inicia o scheduler. Chamado no startup do FastAPI.

    Roda a cada 15 minutos verificando quais syncs estao na janela de execucao.
    """
    global _scheduler  # noqa: PLW0603
    if _scheduler is not None:
        return
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        _tick,
        trigger=CronTrigger(minute="*/15"),
        id="sync_scan",
        replace_existing=True,
    )
    scheduler.start()
    _scheduler = scheduler
    logger.info("Scheduler iniciado (scan de syncs a cada 15 min)")


def shutdown_scheduler() -> None:
    global _scheduler  # noqa: PLW0603
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler encerrado")
