"""Phase 1-compatible normalization for live/raw observations."""
from __future__ import annotations
from datetime import date, datetime, time
import math
import re

AIRLINE_MAP = {
    "air india": "Air India", "airindia": "Air India",
    "air india express": "Air India Express", "airindiaexpress": "Air India Express",
    "akasa air": "Akasa Air", "akasa": "Akasa Air",
    "indigo": "IndiGo", "indigo airlines": "IndiGo",
    "spicejet": "SpiceJet", "spice jet": "SpiceJet",
}
AVAILABILITY_MAP = {
    "available": "AVAILABLE", "available to book": "AVAILABLE",
    "sold out": "SOLD_OUT", "sold-out": "SOLD_OUT", "soldout": "SOLD_OUT", "sold_out": "SOLD_OUT",
    "unavailable": "MISSING", "not available": "MISSING", "": "MISSING",
    "missing": "MISSING", "unknown": "UNKNOWN", "scrape_error": "UNKNOWN", "error": "UNKNOWN",
}
VALID_LEAD_TIMES = {"T+1":1,"T+7":7,"T+15":15,"T+30":30,"T+45":45}


def canonical_airline(value: str) -> str:
    key = re.sub(r"\s+", " ", str(value).strip().lower())
    return AIRLINE_MAP.get(key, str(value).strip())


def normalize_availability(value: str | None) -> str:
    key = re.sub(r"\s+", " ", str(value or "").strip().lower())
    return AVAILABILITY_MAP.get(key, "UNKNOWN")


def normalize_route(origin: str, destination: str) -> str:
    return f"{origin.strip().upper()}-{destination.strip().upper()}"


def coerce_money(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, str):
        s = re.sub(r"[^\d.\-]", "", v.replace(",", ""))
        return float(s) if s else None
    return float(v)


def _parse_date(v):
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    return date.fromisoformat(str(v))


def _parse_time(v):
    if isinstance(v, time):
        return v
    return time.fromisoformat(str(v))


def _parse_timestamp(v):
    if isinstance(v, datetime):
        return v
    return datetime.fromisoformat(str(v))


def normalize_observation(raw: dict) -> dict:
    d = dict(raw)
    d["origin"] = str(d.get("origin", "")).upper().strip()
    d["destination"] = str(d.get("destination", "")).upper().strip()
    d["route"] = normalize_route(d["origin"], d["destination"])
    d["airline"] = canonical_airline(d.get("airline", ""))
    d["availability"] = normalize_availability(d.get("availability"))
    for field in ("base_fare", "taxes", "fees", "total_fare"):
        d[field] = coerce_money(d.get(field))
    d["fare_class"] = str(d.get("fare_class") or "Economy").strip()
    d["travel_date"] = _parse_date(d.get("travel_date"))
    d["search_date"] = _parse_date(d.get("search_date"))
    d["search_time"] = _parse_time(d.get("search_time"))
    d["timestamp"] = _parse_timestamp(d.get("timestamp"))

    d["source_lead_time"] = d.get("lead_time")
    d["lead_time_days"] = (d["travel_date"] - d["search_date"]).days
    expected_label = next((label for label, days in VALID_LEAD_TIMES.items() if days == d["lead_time_days"]), None)
    d["lead_time"] = expected_label or str(d.get("lead_time") or "")
    d["lead_time_mismatch"] = bool(d["source_lead_time"] and expected_label and d["source_lead_time"] != expected_label)
    return d
