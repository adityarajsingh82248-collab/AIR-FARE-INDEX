"""Validation logic aligned with Phase 1 data dictionary, with Phase 2 additions."""
from __future__ import annotations
from datetime import date
from collections import defaultdict
import math

VALID_AIRPORTS = {"DEL","BOM","BLR","CCU","HYD","MAA"}
VALID_AVAILABILITY = {"AVAILABLE","SOLD_OUT","MISSING","UNKNOWN"}
VALID_FARE_FLAGS = {"VALID","MINOR_DIFFERENCE","INVALID","MISSING_COMPONENT"}
VALID_WINDOWS = {"T+1":1,"T+7":7,"T+15":15,"T+30":30,"T+45":45}


def fare_consistency(base, taxes, fees, total, tolerance=2.0):
    if any(v is None for v in (base, taxes, fees)) or total is None:
        return "MISSING_COMPONENT"
    diff = abs((base + taxes + fees) - total)
    if diff <= tolerance:
        return "VALID"
    if diff <= 10:
        return "MINOR_DIFFERENCE"
    return "INVALID"


def validate_observation(o: dict, tolerance=2.0) -> dict:
    reasons=[]
    for f in ["origin","destination","airline","travel_date","search_date","search_time","lead_time","fare_class","source","timestamp"]:
        if o.get(f) in (None,""): reasons.append(f"missing_{f}")
    origin, destination = o.get("origin"), o.get("destination")
    if origin not in VALID_AIRPORTS: reasons.append("invalid_origin")
    if destination not in VALID_AIRPORTS: reasons.append("invalid_destination")
    if origin == destination and origin is not None: reasons.append("origin_equals_destination")
    if isinstance(o.get("travel_date"), date) and isinstance(o.get("search_date"), date):
        if o["travel_date"] < o["search_date"]: reasons.append("travel_before_search")
        calc = (o["travel_date"] - o["search_date"]).days
        if o.get("lead_time_days") != calc: reasons.append("lead_time_mismatch")
        if o.get("lead_time") in VALID_WINDOWS and VALID_WINDOWS[o["lead_time"]] != calc:
            reasons.append("booking_window_mismatch")
        if o.get("source_lead_time") and o.get("source_lead_time") != o.get("lead_time"):
            reasons.append("source_lead_time_mismatch")
    if o.get("availability") not in VALID_AVAILABILITY: reasons.append("invalid_availability")
    for f in ["base_fare","taxes","fees","total_fare"]:
        v=o.get(f)
        if v is not None and (not isinstance(v,(int,float)) or math.isnan(v) or v<0): reasons.append(f"invalid_{f}")
    fare_flag=fare_consistency(o.get("base_fare"),o.get("taxes"),o.get("fees"),o.get("total_fare"),tolerance)
    if fare_flag=="INVALID": reasons.append("fare_inconsistent")
    if o.get("availability")=="AVAILABLE" and o.get("total_fare") is None: reasons.append("missing_fare_for_available")
    o["fare_consistency_flag"]=fare_flag
    o["validation_status"]="VALID" if not reasons else "INVALID"
    o["validation_reason"]=";".join(reasons) or None
    o["usable_for_index"]=(o["validation_status"]=="VALID" and fare_flag in {"VALID","MINOR_DIFFERENCE"} and o["availability"]=="AVAILABLE")
    return o


def classify_duplicates(observations: list[dict]) -> list[dict]:
    """Exact duplicate = same observation identity at the same search timestamp.

    Intraday repeats are preserved and explicitly labelled rather than removed.
    Flight number is included when available to reduce false duplicate matches.
    """
    seen_exact=set()
    seen_repeat=defaultdict(int)
    for o in observations:
        exact=(
            o.get("source"), o.get("route"), o.get("airline"), o.get("travel_date"),
            o.get("search_date"), o.get("search_time"), o.get("fare_class"),
            o.get("flight_number"),
        )
        repeat=(o.get("source"),o.get("route"),o.get("airline"),o.get("travel_date"),o.get("lead_time"),o.get("fare_class"))
        if exact in seen_exact:
            o["duplicate_flag"]="TRUE_DUPLICATE_SAME_TIMESTAMP"
        elif repeat in seen_repeat:
            o["duplicate_flag"]="INTRADAY_REPEAT_CHECK"
        else:
            o["duplicate_flag"]="UNIQUE"
        seen_exact.add(exact)
        seen_repeat[repeat]+=1
    return observations
