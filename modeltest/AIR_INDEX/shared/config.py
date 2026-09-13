"""Shared configuration loader — single source of truth for routes, booking windows, weights."""
from __future__ import annotations
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]


def load_routes() -> list[dict]:
    """Load canonical route definitions from CONFIG/routes.yaml."""
    with (ROOT / "CONFIG" / "routes.yaml").open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    routes = data.get("routes", [])
    return [
        {
            "origin": str(r["origin"]).upper(),
            "destination": str(r["destination"]).upper(),
            "route_code": f"{str(r['origin']).upper()}-{str(r['destination']).upper()}",
        }
        for r in routes
    ]


def load_booking_windows() -> list[dict]:
    """Load canonical booking window definitions from CONFIG/booking_windows.yaml."""
    with (ROOT / "CONFIG" / "booking_windows.yaml").open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("booking_windows", [])


def load_weights() -> dict:
    """Load route weights from PHASE_3/CONFIG/weights.yaml."""
    with (ROOT / "PHASE_3" / "CONFIG" / "weights.yaml").open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data


def route_codes() -> list[str]:
    """Return list of route codes like ['DEL-BOM', 'DEL-BLR', ...]."""
    return [r["route_code"] for r in load_routes()]


def booking_window_labels() -> list[str]:
    """Return list of booking window labels like ['T+1', 'T+7', ...]."""
    return [w["label"] for w in load_booking_windows()]
