"""Common collector contracts and safety controls for AIR-INDEX Phase 2."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import datetime, date, time
from typing import Any, Iterable
import time as time_module
import uuid


@dataclass
class CollectionContext:
    source: str
    route: str
    origin: str
    destination: str
    search_date: date
    search_time: time
    travel_date: date
    lead_time: str
    lead_time_days: int
    fare_class: str = "Economy"
    run_id: str = ""


@dataclass
class RawObservation:
    observation_id: str
    origin: str
    destination: str
    route: str
    airline: str
    travel_date: date
    search_date: date
    search_time: time
    lead_time: str
    lead_time_days: int
    fare_class: str
    base_fare: float | None
    taxes: float | None
    fees: float | None
    total_fare: float | None
    availability: str
    source: str
    timestamp: datetime
    source_url: str | None = None
    collector_name: str | None = None
    collection_run_id: str | None = None
    currency: str | None = "INR"
    flight_number: str | None = None
    departure_time: str | None = None
    arrival_time: str | None = None
    duration: str | None = None
    stops: int | None = None
    raw_payload: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        for key, value in d.items():
            if hasattr(value, "isoformat"):
                d[key] = value.isoformat()
        return d


def new_run_id(source: str, now: datetime | None = None) -> str:
    now = now or datetime.now()
    safe_source = "".join(c for c in source.upper() if c.isalnum())[:20] or "BATCH"
    return f"RUN_{now:%Y%m%d_%H%M%S}_{safe_source}_{uuid.uuid4().hex[:6].upper()}"


class BaseCollector(ABC):
    """Source-independent interface. Concrete collectors must respect permit gates."""

    def __init__(
        self,
        source_name: str,
        source_url: str,
        permitted: bool = False,
        request_delay_seconds: float = 1.0,
        max_retries: int = 3,
    ):
        self.source_name = source_name
        self.source_url = source_url
        self.permitted = permitted
        self.request_delay_seconds = max(0.0, float(request_delay_seconds))
        self.max_retries = max(1, int(max_retries))

    def ensure_permitted(self) -> None:
        if not self.permitted:
            raise PermissionError(
                f"Collection disabled for {self.source_name}. "
                "Set permitted=true only after documented authorization."
            )

    def pace(self) -> None:
        if self.request_delay_seconds:
            time_module.sleep(self.request_delay_seconds)

    @abstractmethod
    def collect(self, contexts: Iterable[CollectionContext]) -> list[RawObservation]:
        raise NotImplementedError
