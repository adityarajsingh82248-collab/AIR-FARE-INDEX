"""Authorized conventional HTML/API adapter.

Use only with a source-approved endpoint that explicitly permits automated access.
"""
from __future__ import annotations
from datetime import datetime
from typing import Iterable

import requests

from .base_collector import BaseCollector, CollectionContext, RawObservation


class AuthorizedHTTPCollector(BaseCollector):
    def __init__(
        self,
        source_name: str,
        source_url: str,
        permitted: bool,
        endpoint_template: str | None,
        timeout_seconds: int = 30,
        request_delay_seconds: float = 1.0,
        max_retries: int = 3,
    ):
        super().__init__(source_name, source_url, permitted, request_delay_seconds, max_retries)
        self.endpoint_template = endpoint_template
        self.timeout_seconds = int(timeout_seconds)

    def collect(self, contexts: Iterable[CollectionContext]) -> list[RawObservation]:
        self.ensure_permitted()
        if not self.endpoint_template:
            raise ValueError(f"No authorized endpoint_template configured for {self.source_name}.")
        results: list[RawObservation] = []
        session = requests.Session()
        for ctx in contexts:
            url = self.endpoint_template.format(
                origin=ctx.origin,
                destination=ctx.destination,
                travel_date=ctx.travel_date.isoformat(),
            )
            last_exc = None
            for attempt in range(1, self.max_retries + 1):
                try:
                    response = session.get(url, timeout=self.timeout_seconds)
                    if response.status_code == 429:
                        raise requests.HTTPError("HTTP 429 rate-limit response; collection stopped for this source")
                    response.raise_for_status()
                    payload = response.json()
                    results.extend(self.parse_payload(payload, ctx, url))
                    self.pace()
                    last_exc = None
                    break
                except (requests.RequestException, ValueError) as exc:
                    last_exc = exc
                    if attempt == self.max_retries:
                        raise
                    self.pace()
            if last_exc is not None:
                raise last_exc
        return results

    def parse_payload(self, payload: dict, ctx: CollectionContext, url: str) -> list[RawObservation]:
        if not isinstance(payload, dict):
            raise ValueError("Expected JSON object payload")
        results: list[RawObservation] = []
        for i, item in enumerate(payload.get("observations", []), start=1):
            if not isinstance(item, dict):
                continue
            ts = datetime.now().astimezone().replace(tzinfo=None)
            results.append(RawObservation(
                observation_id=f"RAW_{ctx.run_id}_{i:04d}",
                origin=ctx.origin, destination=ctx.destination,
                route=f"{ctx.origin}-{ctx.destination}",
                airline=item.get("airline", self.source_name),
                travel_date=ctx.travel_date, search_date=ctx.search_date,
                search_time=ctx.search_time, lead_time=ctx.lead_time,
                lead_time_days=ctx.lead_time_days,
                fare_class=item.get("fare_class", "Economy"),
                base_fare=item.get("base_fare"), taxes=item.get("taxes"),
                fees=item.get("fees"), total_fare=item.get("total_fare"),
                availability=item.get("availability", "MISSING"),
                source=self.source_name, timestamp=ts,
                source_url=url, collector_name=self.__class__.__name__,
                collection_run_id=ctx.run_id, currency=item.get("currency", "INR"),
                flight_number=item.get("flight_number"),
                departure_time=item.get("departure_time"),
                arrival_time=item.get("arrival_time"), duration=item.get("duration"),
                stops=item.get("stops"), raw_payload=item,
            ).to_dict())
        return results


Source2Collector = AuthorizedHTTPCollector
