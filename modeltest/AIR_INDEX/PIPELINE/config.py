"""Validated YAML configuration loader for Phase 2."""
from __future__ import annotations
from pathlib import Path
import os
import yaml

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_SOURCE_FIELDS = {
    "name", "type", "url", "access_method", "permitted", "status",
    "permission_status", "request_delay_seconds", "timeout_seconds", "max_retries",
}
VALID_STATUSES = {"PLANNED", "AUDIT_REQUIRED", "AUTHORIZATION_PENDING", "RESTRICTED", "DEFERRED", "MOCK", "LIVE", "FAILED"}
VALID_ACCESS = {"playwright", "http", "mock", "indigo_ndc"}
VALID_ENVS = {"TEST", "DEVELOPMENT", "PRODUCTION"}


def load_yaml(name: str) -> dict:
    with (ROOT / "CONFIG" / name).open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_routes() -> list[dict]:
    routes = load_yaml("routes.yaml").get("routes", [])
    if not routes:
        raise ValueError("No routes configured")
    out = []
    for r in routes:
        origin, destination = str(r["origin"]).upper(), str(r["destination"]).upper()
        if len(origin) != 3 or len(destination) != 3 or origin == destination:
            raise ValueError(f"Invalid route configuration: {r}")
        out.append({"origin": origin, "destination": destination})
    return out


def load_booking_windows() -> list[dict]:
    windows = load_yaml("booking_windows.yaml").get("booking_windows", [])
    if not windows:
        raise ValueError("No booking windows configured")
    out = []
    for w in windows:
        label = str(w["label"])
        days = int(w["lead_time_days"])
        if label != f"T+{days}" or days <= 0:
            raise ValueError(f"Invalid booking window: {w}")
        out.append({"label": label, "lead_time_days": days})
    return out


def load_sources() -> list[dict]:
    sources = load_yaml("sources.yaml").get("sources", [])
    if not sources:
        raise ValueError("No sources configured")
    names = set()
    for s in sources:
        missing = REQUIRED_SOURCE_FIELDS - set(s)
        if missing:
            raise ValueError(f"Source {s.get('name')} missing config fields: {sorted(missing)}")
        if s["name"] in names:
            raise ValueError(f"Duplicate source name: {s['name']}")
        names.add(s["name"])
        if s["status"] not in VALID_STATUSES:
            raise ValueError(f"Invalid status for {s['name']}: {s['status']}")
        if s["access_method"] not in VALID_ACCESS:
            raise ValueError(f"Invalid access_method for {s['name']}: {s['access_method']}")
        if int(s["max_retries"]) < 1:
            raise ValueError(f"max_retries must be >=1 for {s['name']}")
        if float(s["request_delay_seconds"]) < 0:
            raise ValueError(f"request_delay_seconds must be >=0 for {s['name']}")
        if int(s["timeout_seconds"]) <= 0:
            raise ValueError(f"timeout_seconds must be >0 for {s['name']}")
        if bool(s["permitted"]) and s["status"] != "LIVE":
            raise ValueError(f"A permitted source must be status=LIVE: {s['name']}")
        if s["status"] == "LIVE" and not bool(s["permitted"]):
            raise ValueError(f"LIVE source must set permitted=true: {s['name']}")
        if s["status"] == "LIVE":
            if s["access_method"] == "playwright" and not s.get("selectors"):
                raise ValueError(f"LIVE Playwright source requires explicit selectors: {s['name']}")
            if s["access_method"] in {"http", "indigo_ndc"} and not s.get("endpoint_template"):
                raise ValueError(f"LIVE API source requires explicit endpoint_template: {s['name']}")
    return sources


def environment() -> str:
    value = os.getenv("APP_ENV", "DEVELOPMENT").upper()
    if value not in VALID_ENVS:
        raise ValueError(f"APP_ENV must be one of {sorted(VALID_ENVS)}")
    return value


def collection_mode(cli_mode: str | None = None) -> str:
    value = (cli_mode or os.getenv("COLLECTION_MODE", "fixture")).lower()
    if value not in {"fixture", "live"}:
        raise ValueError("COLLECTION_MODE must be fixture or live")
    return value


def validate_all() -> dict:
    return {"routes": load_routes(), "booking_windows": load_booking_windows(), "sources": load_sources()}
