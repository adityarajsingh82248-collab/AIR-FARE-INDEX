"""Authorized Playwright adapter.

This adapter is permission-gated. It does not implement CAPTCHA, anti-bot,
authentication bypass, proxy rotation, hidden API discovery, or other
restriction-evasion behavior. Selector profiles belong in CONFIG and must only
be enabled after the source owner permits automated collection.
"""
from __future__ import annotations
import re
from datetime import datetime
from typing import Iterable

from .base_collector import BaseCollector, CollectionContext, RawObservation


class AuthorizedPlaywrightCollector(BaseCollector):
    def __init__(
        self,
        source_name: str,
        source_url: str,
        permitted: bool,
        selectors: dict,
        timeout_ms: int = 30000,
        request_delay_seconds: float = 1.0,
        max_retries: int = 3,
    ):
        super().__init__(source_name, source_url, permitted, request_delay_seconds, max_retries)
        self.selectors = selectors or {}
        self.timeout_ms = int(timeout_ms)

    @staticmethod
    def _parse_money(text: str | None) -> float | None:
        if not text:
            return None
        cleaned = re.sub(r"[^\d.\-]", "", text.replace(",", ""))
        try:
            return float(cleaned) if cleaned else None
        except ValueError:
            return None

    def collect(self, contexts: Iterable[CollectionContext]) -> list[RawObservation]:
        self.ensure_permitted()
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError  # type: ignore
        from playwright.sync_api import sync_playwright  # type: ignore

        observations: list[RawObservation] = []
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_default_timeout(self.timeout_ms)
            try:
                for ctx in contexts:
                    last_exc = None
                    for attempt in range(1, self.max_retries + 1):
                        try:
                            search_url = self.build_search_url(ctx)
                            page.goto(search_url, wait_until="domcontentloaded")
                            observations.extend(self.parse_page(page, ctx))
                            self.pace()
                            last_exc = None
                            break
                        except (PlaywrightTimeoutError, OSError, RuntimeError) as exc:
                            last_exc = exc
                            if attempt == self.max_retries:
                                raise
                            self.pace()
                    if last_exc is not None:
                        raise last_exc
            finally:
                browser.close()
        return observations

    def build_search_url(self, ctx: CollectionContext) -> str:
        template = self.selectors.get("search_url_template")
        if not template:
            raise ValueError("Missing source-approved search_url_template.")
        return template.format(
            origin=ctx.origin,
            destination=ctx.destination,
            travel_date=ctx.travel_date.isoformat(),
        )

    def parse_page(self, page, ctx: CollectionContext) -> list[RawObservation]:
        row_selector = self.selectors.get("row_selector")
        if not row_selector:
            raise ValueError("Missing row_selector in selector profile.")

        results: list[RawObservation] = []
        rows = page.locator(row_selector)
        for i in range(rows.count()):
            row = rows.nth(i)
            airline = self._text(row, self.selectors.get("airline"))
            total = self._parse_money(self._text(row, self.selectors.get("total_fare")))
            base = self._parse_money(self._text(row, self.selectors.get("base_fare")))
            taxes = self._parse_money(self._text(row, self.selectors.get("taxes")))
            fees = self._parse_money(self._text(row, self.selectors.get("fees")))
            availability = self._text(row, self.selectors.get("availability")) or "MISSING"
            ts = datetime.now().astimezone().replace(tzinfo=None)
            results.append(RawObservation(
                observation_id=f"RAW_{ctx.run_id}_{i+1:04d}",
                origin=ctx.origin, destination=ctx.destination,
                route=f"{ctx.origin}-{ctx.destination}",
                airline=airline or self.source_name,
                travel_date=ctx.travel_date, search_date=ctx.search_date,
                search_time=ctx.search_time, lead_time=ctx.lead_time,
                lead_time_days=ctx.lead_time_days, fare_class=ctx.fare_class,
                base_fare=base, taxes=taxes, fees=fees, total_fare=total,
                availability=availability, source=self.source_name, timestamp=ts,
                source_url=page.url, collector_name=self.__class__.__name__,
                collection_run_id=ctx.run_id, raw_payload={"text": row.inner_text()},
            ).to_dict())
        return results

    @staticmethod
    def _text(row, selector: str | None) -> str | None:
        if not selector:
            return None
        loc = row.locator(selector)
        if loc.count() == 0:
            return None
        return loc.first.inner_text().strip()


Source1Collector = AuthorizedPlaywrightCollector
