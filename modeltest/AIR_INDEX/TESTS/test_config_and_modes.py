import os
import subprocess
import sys
from PIPELINE.config import load_routes, load_booking_windows, load_sources


def test_configured_routes_and_windows_are_dynamic():
    assert [r["origin"]+"-"+r["destination"] for r in load_routes()] == ["BLR-HYD","BOM-BLR","DEL-BLR","DEL-BOM","DEL-CCU","MAA-DEL"]
    assert [w["label"] for w in load_booking_windows()] == ["T+1","T+7","T+15","T+30","T+45"]


def test_no_source_is_live_without_permission():
    assert not [s for s in load_sources() if s["status"] == "LIVE"]


def test_live_mode_fails_closed_when_no_authorized_source(monkeypatch):
    env = os.environ.copy()
    env["APP_ENV"] = "PRODUCTION"
    env["COLLECTION_MODE"] = "live"
    p = subprocess.run([sys.executable,"-m","PIPELINE.run_collection","--live","--environment","PRODUCTION"],capture_output=True,text=True,env=env)
    assert p.returncode == 2
    assert "No authorized live source is configured." in p.stderr


def test_fixture_is_rejected_in_production():
    env = os.environ.copy()
    env["APP_ENV"] = "PRODUCTION"
    p = subprocess.run([sys.executable,"-m","PIPELINE.run_collection","--fixture","--environment","PRODUCTION"],capture_output=True,text=True,env=env)
    assert p.returncode != 0
    assert "Fixture mode is forbidden in PRODUCTION" in p.stderr


def test_scheduler_is_production_safe(monkeypatch):
    import SCHEDULER.scheduler as scheduler
    monkeypatch.setenv("APP_ENV", "PRODUCTION")
    monkeypatch.setenv("COLLECTION_MODE", "fixture")
    scheduler.APP_ENV = "PRODUCTION"
    scheduler.COLLECTION_MODE = "fixture"
    try:
        scheduler.command()
    except RuntimeError as exc:
        assert "requires COLLECTION_MODE=live" in str(exc)
    else:
        raise AssertionError("Production scheduler must reject fixture mode")
