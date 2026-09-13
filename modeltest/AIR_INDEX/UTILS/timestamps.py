"""Date/lead-time helpers."""
from __future__ import annotations
from datetime import date, datetime, time, timedelta

def travel_date_for(search_date: date, lead_time_days: int) -> date:
    if lead_time_days <= 0: raise ValueError("lead_time_days must be positive")
    return search_date + timedelta(days=lead_time_days)

def search_timestamp(search_date: date, search_time: time) -> datetime:
    return datetime.combine(search_date, search_time)
