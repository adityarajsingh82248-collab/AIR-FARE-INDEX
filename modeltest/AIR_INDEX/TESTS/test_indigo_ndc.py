from datetime import date, time
from pathlib import Path

from COLLECTORS.base_collector import CollectionContext
from COLLECTORS.indigo_ndc_collector import (
    build_airshopping_request,
    check_indigo_credentials,
    parse_airshopping_response,
)

ROOT = Path(__file__).resolve().parents[1]


def context():
    return CollectionContext(
        source="IndiGo NDC", route="DEL-BOM", origin="DEL", destination="BOM",
        search_date=date(2026, 9, 8), search_time=time(9, 0),
        travel_date=date(2026, 9, 9), lead_time="T+1", lead_time_days=1,
        run_id="RUN_TEST_INDIGO",
    )


def test_airshopping_request_contains_route_and_date():
    xml = build_airshopping_request("DEL", "BOM", "2026-09-09")
    assert "<c:IATA_LocationCode>BOM</c:IATA_LocationCode>" in xml
    assert "<c:IATA_LocationCode>DEL</c:IATA_LocationCode>" in xml
    assert "<c:Date>2026-09-09</c:Date>" in xml
    assert "21.3" in xml


def test_parse_indigo_airshopping_fixture():
    payload = (ROOT / "DATA" / "sample" / "indigo_airshopping_response.xml").read_bytes()
    rows = parse_airshopping_response(payload, context(), "https://client.ndc.navitaire.com/v21.3/AirShopping")
    assert len(rows) == 1
    row = rows[0].to_dict()
    assert row["airline"] == "IndiGo"
    assert row["route"] == "DEL-BOM"
    assert row["base_fare"] == 5000.0
    assert row["taxes"] == 900.0
    assert row["total_fare"] == 5900.0
    assert row["availability"] == "AVAILABLE"
    assert row["flight_number"] == "6E1234"
    assert row["fare_class"] == "Economy"
    assert row["duration"] == "PT2H10M"


def test_check_indigo_credentials_reports_each_missing_var():
    missing = check_indigo_credentials(env={})
    assert missing == [
        "Missing INDIGO_NDC_SUBSCRIPTION_KEY",
        "Missing INDIGO_NDC_USERNAME",
        "Missing INDIGO_NDC_PASSWORD",
    ]


def test_check_indigo_credentials_passes_when_all_present():
    env = {
        "INDIGO_NDC_SUBSCRIPTION_KEY": "k",
        "INDIGO_NDC_USERNAME": "u",
        "INDIGO_NDC_PASSWORD": "p",
    }
    assert check_indigo_credentials(env=env) == []


def test_check_indigo_credentials_never_leaks_values_in_messages():
    env = {"INDIGO_NDC_SUBSCRIPTION_KEY": "TOP_SECRET_VALUE"}
    missing = check_indigo_credentials(env=env)
    assert not any("TOP_SECRET_VALUE" in m for m in missing)
    assert "Missing INDIGO_NDC_USERNAME" in missing
    assert "Missing INDIGO_NDC_PASSWORD" in missing
