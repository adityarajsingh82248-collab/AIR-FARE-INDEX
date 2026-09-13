"""Celery scheduler with explicit environment/mode separation.

Celery is optional for local inspection/testing; when installed, the same
functions become a normal Celery app and beat schedule.
"""
from __future__ import annotations
import os
import subprocess
import sys

APP_ENV = os.getenv("APP_ENV", "PRODUCTION").upper()
COLLECTION_MODE = os.getenv("COLLECTION_MODE", "live").lower()


def command() -> list[str]:
    if APP_ENV == "PRODUCTION":
        if COLLECTION_MODE != "live":
            raise RuntimeError("PRODUCTION scheduler requires COLLECTION_MODE=live")
        return [sys.executable, "-m", "PIPELINE.run_collection", "--live", "--environment", "PRODUCTION"]
    if COLLECTION_MODE == "live":
        return [sys.executable, "-m", "PIPELINE.run_collection", "--live", "--environment", APP_ENV]
    return [sys.executable, "-m", "PIPELINE.run_collection", "--fixture", "--environment", APP_ENV]


def run_once() -> int:
    return subprocess.run(command(), check=False).returncode


try:
    from celery import Celery
    from celery.schedules import crontab
except ImportError:
    Celery = None
    crontab = None
    celery_app = None
else:
    celery_app = Celery("air_index")
    celery_app.conf.broker_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    celery_app.conf.beat_schedule = {
        "daily-airfare-collection": {
            "task": "SCHEDULER.scheduler.run_collection_task",
            "schedule": crontab(minute=0, hour=9),
        }
    }

    @celery_app.task(name="SCHEDULER.scheduler.run_collection_task")
    def run_collection_task():
        return run_once()


def main() -> int:
    return run_once()


if __name__ == "__main__":
    raise SystemExit(main())
