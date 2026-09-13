"""Authorized IndiGo NDC AirShopping collector.

This adapter targets IndiGo's documented NDC interface. It remains disabled until
explicit authorization/credentials are supplied. It never attempts website scraping
or restriction bypassing.
"""
from __future__ import annotations

import base64
import json
import os
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Any, Iterable

import requests

from .base_collector import BaseCollector, CollectionContext, RawObservation


NS_MESSAGE = "http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersMessage"
NS_COMMON = "http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersCommonTypes"


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children(el: ET.Element, name: str):
    return [c for c in list(el) if _local(c.tag) == name]


def _first(el: ET.Element | None, name: str) -> ET.Element | None:
    if el is None:
        return None
    for node in el.iter():
        if _local(node.tag) == name:
            return node
    return None


def _text(el: ET.Element | None, name: str) -> str | None:
    node = _first(el, name)
    return (node.text or "").strip() if node is not None and node.text else None


def _float_text(el: ET.Element | None, name: str) -> float | None:
    value = _text(el, name)
    if value in (None, ""):
        return None
    try:
        return float(value.replace(",", ""))
    except ValueError:
        return None


def _parse_xml(payload: str | bytes) -> ET.Element:
    try:
        return ET.fromstring(payload)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid IndiGo NDC XML response: {exc}") from exc


def _auth_header(username: str, password: str) -> str:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return f"Basic {token}"


def build_airshopping_request(origin: str, destination: str, travel_date: str) -> str:
    """Build the documented IATA NDC 21.3 one-way AirShopping request."""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<IATA_AirShoppingRQ xmlns="{NS_MESSAGE}" xmlns:c="{NS_COMMON}">
  <DistributionChain>
    <DistributionChainLink>
      <c:Ordinal>1</c:Ordinal>
      <c:OrgRole>Seller</c:OrgRole>
      <c:ParticipatingOrg>
        <c:Name>6E Travel</c:Name>
        <c:OrgID>TESTAPI</c:OrgID>
      </c:ParticipatingOrg>
    </DistributionChainLink>
  </DistributionChain>
  <PayloadAttributes>
    <c:VersionNumber>21.3</c:VersionNumber>
  </PayloadAttributes>
  <POS>
    <c:Country>
      <c:CountryCode>IN</c:CountryCode>
      <c:CountryName>India</c:CountryName>
    </c:Country>
  </POS>
  <Request>
    <c:FlightRequest>
      <c:FlightRequestOriginDestinationsCriteria>
        <c:OriginDestCriteria>
          <c:DestArrivalCriteria>
            <c:IATA_LocationCode>{destination}</c:IATA_LocationCode>
          </c:DestArrivalCriteria>
          <c:OriginDepCriteria>
            <c:Date>{travel_date}</c:Date>
            <c:IATA_LocationCode>{origin}</c:IATA_LocationCode>
          </c:OriginDepCriteria>
        </c:OriginDestCriteria>
      </c:FlightRequestOriginDestinationsCriteria>
    </c:FlightRequest>
    <c:PaxList>
      <c:Pax><c:PaxID>ADT0</c:PaxID><c:PTC>ADT</c:PTC></c:Pax>
    </c:PaxList>
    <c:ResponseParameters>
      <c:CurParameter><c:CurCode>INR</c:CurCode></c:CurParameter>
    </c:ResponseParameters>
  </Request>
</IATA_AirShoppingRQ>'''


def parse_airshopping_response(payload: str | bytes, context: CollectionContext, source_url: str) -> list[RawObservation]:
    """Parse documented AirShoppingRS offers into AIR-INDEX RawObservation records."""
    root = _parse_xml(payload)
    response = _first(root, "Response")
    if response is None:
        raise ValueError("IndiGo AirShopping response has no Response element")

    # Reference data from DataLists.
    segment_by_id: dict[str, ET.Element] = {}
    operating_by_id: dict[str, ET.Element] = {}
    pax_segment_by_id: dict[str, ET.Element] = {}
    journey_segments: dict[str, list[str]] = {}
    price_class_by_id: dict[str, str] = {}

    for node in response.iter():
        tag = _local(node.tag)
        if tag == "DatedMarketingSegment":
            sid = _text(node, "DatedMarketingSegmentId")
            if sid:
                segment_by_id[sid] = node
        elif tag == "DatedOperatingSegment":
            sid = _text(node, "DatedOperatingSegmentId")
            if sid:
                operating_by_id[sid] = node
        elif tag == "PaxSegment":
            sid = _text(node, "PaxSegmentID")
            if sid:
                pax_segment_by_id[sid] = node
        elif tag == "PaxJourney":
            jid = _text(node, "PaxJourneyID")
            if jid:
                journey_segments[jid] = [
                    (c.text or "").strip() for c in node.iter() if _local(c.tag) == "PaxSegmentRefID" and c.text
                ]
        elif tag == "PriceClass":
            pid = _text(node, "PriceClassID")
            if pid:
                price_class_by_id[pid] = _text(node, "Name") or "Economy"

    offers = [n for n in response.iter() if _local(n.tag) == "Offer"]
    observations: list[RawObservation] = []

    for offer in offers:
        offer_id = _text(offer, "OfferID") or uuid.uuid4().hex
        offer_items = _children(offer, "OfferItem")
        item = offer_items[0] if offer_items else offer

        price = _first(item, "Price")
        if price is None:
            price = _first(offer, "Price")
        base = _float_text(price, "BaseAmount")
        taxes = _float_text(price, "TotalTaxAmount")
        total = _float_text(price, "TotalAmount")
        fees = None
        fee_values = []
        if price is not None:
            for fee in [n for n in price.iter() if _local(n.tag) == "Fee"]:
                amount = _float_text(fee, "Amount")
                if amount is not None:
                    fee_values.append(amount)
        if fee_values:
            fees = sum(fee_values)

        # Prefer the PaxSegment reference in the first FareComponent.
        segment_id = _text(item, "PaxSegmentRefID")
        if not segment_id:
            journey_id = _text(offer, "PaxJourneyRefID")
            refs = journey_segments.get(journey_id or "", [])
            segment_id = refs[0] if refs else None
        marketing = segment_by_id.get(segment_id or "")
        if marketing is None and segment_id:
            pax_segment = pax_segment_by_id.get(segment_id)
            marketing_ref = _text(pax_segment, "DatedMarketingSegmentRefId") if pax_segment is not None else None
            marketing = segment_by_id.get(marketing_ref or "")

        # The source response identifies the operating segment separately.
        operating = None
        if marketing is not None:
            operating_id = _text(marketing, "DatedOperatingSegmentRefId")
            operating = operating_by_id.get(operating_id or "")

        departure = _text(marketing, "AircraftScheduledDateTime") if marketing is not None else None
        arrival = None
        flight_number = None
        if marketing is not None:
            dep = _first(marketing, "Dep")
            arr = _first(marketing, "Arrival")
            departure = _text(dep, "AircraftScheduledDateTime") or departure
            arrival = _text(arr, "AircraftScheduledDateTime")
            flight_number = _text(marketing, "MarketingCarrierFlightNumberText")

        duration = _text(operating, "Duration") if operating is not None else None
        fare_component = _first(item, "FareComponent")
        cabin = _text(fare_component, "CabinTypeName") or _text(fare_component, "Name") or context.fare_class
        price_class_id = _text(fare_component, "PriceClassRefID")
        if price_class_id and price_class_id in price_class_by_id:
            # Keep the actual cabin type when available; otherwise preserve fare family in raw payload.
            cabin = cabin or price_class_by_id[price_class_id]

        observations.append(RawObservation(
            observation_id=f"INDIGO_{context.run_id}_{offer_id}"[:120],
            origin=context.origin,
            destination=context.destination,
            route=context.route,
            airline="IndiGo",
            travel_date=context.travel_date,
            search_date=context.search_date,
            search_time=context.search_time,
            lead_time=context.lead_time,
            lead_time_days=context.lead_time_days,
            fare_class=cabin,
            base_fare=base,
            taxes=taxes,
            fees=fees,
            total_fare=total,
            availability="AVAILABLE" if total is not None else "MISSING",
            source="IndiGo NDC",
            timestamp=datetime.combine(context.search_date, context.search_time),
            source_url=source_url,
            collector_name="IndigoNDCCollector",
            collection_run_id=context.run_id,
            currency=(price.find("*").attrib.get("CurCode") if price is not None and len(price) else None) or "INR",
            flight_number=f"6E{flight_number}" if flight_number and not flight_number.startswith("6E") else flight_number,
            departure_time=departure,
            arrival_time=arrival,
            duration=duration,
            stops=0,
            raw_payload={"offer_id": offer_id, "xml_offer": ET.tostring(offer, encoding="unicode")},
        ))
    return observations


REQUIRED_ENV_VARS = ("INDIGO_NDC_SUBSCRIPTION_KEY", "INDIGO_NDC_USERNAME", "INDIGO_NDC_PASSWORD")


def check_indigo_credentials(env: dict | None = None) -> list[str]:
    """Check required IndiGo NDC credential env vars without exposing their values.

    Returns a list of human-readable "Missing <VAR>" messages (empty if all are
    present). Callers use this for an upfront, fail-safe configuration check
    before starting a live run -- see PIPELINE.run_collection.run_live.
    """
    source = env if env is not None else os.environ
    return [f"Missing {name}" for name in REQUIRED_ENV_VARS if not source.get(name)]


class IndigoNDCCollector(BaseCollector):
    """Authorized IndiGo NDC AirShopping client."""

    def __init__(self, timeout_ms: int | None = None, **kwargs):
        super().__init__(**kwargs)
        self.base_url = os.getenv("INDIGO_NDC_BASE_URL", "https://client.ndc.navitaire.com").rstrip("/")
        self.auth_path = os.getenv("INDIGO_NDC_AUTH_PATH", "/v21.3/Authentication")
        self.airshopping_path = os.getenv("INDIGO_NDC_AIRSHOPPING_PATH", "/v21.3/AirShopping")
        self.subscription_key = os.getenv("INDIGO_NDC_SUBSCRIPTION_KEY")
        self.username = os.getenv("INDIGO_NDC_USERNAME")
        self.password = os.getenv("INDIGO_NDC_PASSWORD")
        self.session = requests.Session()
        self.session.headers.update({"Accept-Encoding": "gzip, deflate"})
        self._token: str | None = None
        # timeout_ms comes from CONFIG/sources.yaml (via _collector_for's shared
        # kwargs) as a fallback default; INDIGO_NDC_TIMEOUT_SECONDS always wins
        # when set, since NDC has its own documented timeout guidance.
        fallback_seconds = max(1, int(timeout_ms) // 1000) if timeout_ms else 30
        self.timeout_seconds = int(os.getenv("INDIGO_NDC_TIMEOUT_SECONDS", str(fallback_seconds)))

    def _require_credentials(self) -> None:
        missing = check_indigo_credentials()
        if missing:
            raise RuntimeError("IndiGo NDC credentials not configured: " + "; ".join(missing))

    def _authenticate(self) -> str:
        self._require_credentials()
        response = self.session.post(
            self.base_url + self.auth_path,
            headers={
                "Ocp-Apim-Subscription-Key": self.subscription_key,
                "Authorization": _auth_header(self.username, self.password),
                "Content-Type": "application/xml; charset=utf-8",
                "Accept": "application/json",
            },
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"IndiGo NDC authentication failed: HTTP {response.status_code}: {response.text[:500]}")
        try:
            data = response.json()
        except ValueError:
            data = json.loads(response.text)
        token = data.get("access_token") or data.get("token")
        if not token:
            raise RuntimeError("IndiGo NDC authentication response did not contain an access token")
        self._token = str(token)
        return self._token

    def _post_airshopping(self, xml: str, token: str):
        return self.session.post(
            self.base_url + self.airshopping_path,
            headers={
                "Ocp-Apim-Subscription-Key": self.subscription_key,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/xml; charset=utf-8",
                "Accept": "application/xml",
            },
            data=xml.encode("utf-8"),
            timeout=self.timeout_seconds,
        )

    def collect(self, contexts: Iterable[CollectionContext]) -> list[RawObservation]:
        self.ensure_permitted()
        token = self._authenticate()
        all_observations: list[RawObservation] = []
        for context in contexts:
            self.pace()
            xml = build_airshopping_request(context.origin, context.destination, context.travel_date.isoformat())
            observations_for_context: list[RawObservation] | None = None
            last_exc: Exception | None = None
            for attempt in range(1, self.max_retries + 1):
                try:
                    response = self._post_airshopping(xml, token)
                    if response.status_code == 401:
                        token = self._authenticate()
                        response = self._post_airshopping(xml, token)
                    if response.status_code >= 400:
                        raise RuntimeError(
                            f"IndiGo NDC AirShopping failed: HTTP {response.status_code}: {response.text[:500]}"
                        )
                    observations_for_context = parse_airshopping_response(
                        response.content, context, self.base_url + self.airshopping_path
                    )
                    last_exc = None
                    break
                except (requests.RequestException, RuntimeError, ValueError) as exc:
                    last_exc = exc
                    if attempt == self.max_retries:
                        raise
                    self.pace()
            if last_exc is not None:
                raise last_exc
            all_observations.extend(observations_for_context or [])
        return all_observations
