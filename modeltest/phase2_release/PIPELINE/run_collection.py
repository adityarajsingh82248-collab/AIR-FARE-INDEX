"""Safe, explicit Phase 2 collection runner."""
from __future__ import annotations
import argparse
import json
import os
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

import pandas as pd

from COLLECTORS.base_collector import CollectionContext, new_run_id
from COLLECTORS.source_1_collector import AuthorizedPlaywrightCollector
from COLLECTORS.source_2_collector import AuthorizedHTTPCollector
from COLLECTORS.indigo_ndc_collector import IndigoNDCCollector
from .config import load_routes, load_booking_windows, load_sources, environment
from .process_observations import process
from .raw_ingestion import append_raw
from .database_loader import health_check, initialize_database, start_run, finish_run, load_batch
from UTILS.logging import append_log

ROOT=Path(__file__).resolve().parents[1]


def build_contexts(source: str, search_date: date, run_id: str):
    for route in load_routes():
        for window in load_booking_windows():
            travel_date = search_date + timedelta(days=window["lead_time_days"])
            yield CollectionContext(
                source=source,
                route=f"{route['origin']}-{route['destination']}",
                origin=route["origin"], destination=route["destination"],
                search_date=search_date, search_time=datetime.now().time().replace(microsecond=0),
                travel_date=travel_date, lead_time=window["label"],
                lead_time_days=window["lead_time_days"], run_id=run_id,
            )


def _fixture_rows(search_date: date):
    sample = pd.read_csv(ROOT/"DATA"/"sample"/"airfare_sample.csv")
    templates = sample.head(30).to_dict("records")
    routes, windows = load_routes(), load_booking_windows()
    rows=[]
    for i, (route, window) in enumerate(((r,w) for r in routes for w in windows)):
        template = templates[i % len(templates)]
        travel_date = search_date + timedelta(days=window["lead_time_days"])
        search_time = time(hour=9 + (i % 8), minute=(i*7) % 60)
        rows.append({
            "observation_id": f"FIXTURE_{i+1:04d}",
            "origin": route["origin"], "destination": route["destination"],
            "airline": template["airline"], "travel_date": travel_date.isoformat(),
            "search_date": search_date.isoformat(), "search_time": search_time.isoformat(),
            "lead_time": window["label"], "lead_time_days": window["lead_time_days"],
            "fare_class": "Economy", "base_fare": float(template["base_fare"]),
            "taxes": float(template["taxes"]), "fees": float(template["fees"]),
            "total_fare": float(template["total_fare"]), "availability": "AVAILABLE",
            "source": "MOCK_FIXTURE", "timestamp": datetime.combine(search_date, search_time).isoformat(),
            "currency": "INR", "is_mock": True, "data_mode": "FIXTURE", "environment": "TEST",
        })
    # Explicit edge-case fixtures; never used as live data.
    rows.extend([
        {**rows[0], "observation_id":"FIXTURE_EDGE_SOLD_OUT", "availability":"SOLD_OUT", "total_fare":None},
        {**rows[1], "observation_id":"FIXTURE_EDGE_MISSING", "availability":"MISSING", "total_fare":None},
        {**rows[2], "observation_id":"FIXTURE_EDGE_INCONSISTENT", "total_fare":99999.0},
        {**rows[3], "observation_id":"FIXTURE_EDGE_INVALID_DATE", "travel_date":(search_date-timedelta(days=1)).isoformat()},
        {**rows[4], "observation_id":"FIXTURE_EDGE_INTRADAY", "search_time":"15:45:00"},
        {**rows[4], "observation_id":"FIXTURE_EDGE_DUPLICATE"},
        {**rows[5], "observation_id":"FIXTURE_EDGE_NEGATIVE", "base_fare":-1.0},
        {**rows[6], "observation_id":"FIXTURE_EDGE_UNKNOWN", "availability":"unknown", "total_fare":None},
    ])
    return rows


def run_fixture() -> dict:
    run_id = new_run_id("MOCK_FIXTURE")
    raw = _fixture_rows(date.today())
    for o in raw:
        o["collection_run_id"] = run_id
    append_raw(raw, ROOT/"DATA"/"raw"/"fixture_raw.jsonl")
    validated = process(raw)
    out = ROOT/"DATA"/"processed"/"fixture_validated.csv"
    pd.DataFrame(validated).to_csv(out,index=False)
    summary={
        "mode":"MOCK_FIXTURE", "environment":"TEST", "is_mock":True, "run_id":run_id,
        "records_collected":len(raw),
        "valid_records":sum(x.get("validation_status")=="VALID" for x in validated),
        "rejected_records":sum(x.get("validation_status")!="VALID" for x in validated),
        "duplicates":sum(x.get("duplicate_flag")=="TRUE_DUPLICATE_SAME_TIMESTAMP" for x in validated),
        "usable_for_index":sum(bool(x.get("usable_for_index")) for x in validated),
        "output":str(out.relative_to(ROOT)),
    }
    (ROOT/"LOGS"/"fixture_run_summary.json").write_text(json.dumps(summary,indent=2,default=str),encoding="utf-8")
    return summary


def _collector_for(source: dict):
    common = dict(
        source_name=source["name"], source_url=source["url"], permitted=bool(source["permitted"]),
        timeout_ms=int(source["timeout_seconds"])*1000, request_delay_seconds=float(source["request_delay_seconds"]),
        max_retries=int(source["max_retries"]),
    )
    if source["access_method"] == "playwright":
        return AuthorizedPlaywrightCollector(selectors=source.get("selectors",{}), **common)
    if source["access_method"] == "indigo_ndc":
        return IndigoNDCCollector(**common)
    if source["access_method"] == "http":
        return AuthorizedHTTPCollector(endpoint_template=source.get("endpoint_template"), timeout_seconds=int(source["timeout_seconds"]),
                                       source_name=source["name"], source_url=source["url"], permitted=bool(source["permitted"]),
                                       request_delay_seconds=float(source["request_delay_seconds"]), max_retries=int(source["max_retries"]))
    raise ValueError(f"Unsupported access method: {source['access_method']}")


def run_live(app_env: str) -> int:
    sources = load_sources()
    live_sources = [s for s in sources if s["status"] == "LIVE" and bool(s["permitted"])]
    if app_env == "TEST":
        print("Live collection is disabled in TEST environment.", file=sys.stderr)
        return 2
    if not live_sources:
        print("No authorized live source is configured.", file=sys.stderr)
        return 2

    # Fail before collection begins if a LIVE source's credential configuration
    # is incomplete, rather than discovering it mid-run (Phase 17: configuration
    # must be validated up front; a LIVE+permitted source with missing
    # credentials must still fail safely, never fall back to fixture data).
    from COLLECTORS.indigo_ndc_collector import check_indigo_credentials
    config_errors = []
    for source in live_sources:
        if source["access_method"] == "indigo_ndc":
            missing = check_indigo_credentials()
            if missing:
                config_errors.append(f"{source['name']}: " + "; ".join(missing))
    if config_errors:
        print("LIVE SOURCE NOT CONFIGURED / AUTHORIZED:", file=sys.stderr)
        for line in config_errors:
            print(f"  - {line}", file=sys.stderr)
        return 2

    print(f"Authorized live sources configured: {len(live_sources)}")
    any_success = False
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL is not configured; live collection cannot start.", file=sys.stderr)
        return 2
    import psycopg

    for source in live_sources:
        run_id = new_run_id(source["name"])
        contexts = list(build_contexts(source["name"], date.today(), run_id))
        collector = _collector_for(source)
        started_at = datetime.now()
        conn = None
        run_started = False
        try:
            conn = psycopg.connect(database_url)
            if not health_check(conn):
                raise RuntimeError("PostgreSQL health check failed.")
            initialize_database(conn)
            start_run(conn, run_id, source["name"], started_at)
            run_started = True
            raw_objs = collector.collect(contexts)
            raw = [o if isinstance(o, dict) else o.to_dict() for o in raw_objs]
            for o in raw:
                o["environment"] = app_env
                o["data_mode"] = "LIVE"
                o["is_mock"] = False
            append_raw(raw, ROOT/"DATA"/"raw"/f"{run_id}.jsonl")
            validated = process(raw)
            out = ROOT/"DATA"/"processed"/f"{run_id}.csv"
            pd.DataFrame(validated).to_csv(out,index=False)

            load_batch(conn, validated, run_id, source["name"], started_at)

            append_log(ROOT/"LOGS"/"collection_log.csv", {
                "timestamp":datetime.now().isoformat(), "run_id":run_id, "source":source["name"],
                "status":"SUCCESS", "records_collected":len(raw),
                "records_rejected":sum(x["validation_status"]!="VALID" for x in validated),
                "duration":round((datetime.now()-started_at).total_seconds(),3),
            })
            print(json.dumps({"run_id":run_id,"source":source["name"],"records_collected":len(raw),"valid_records":sum(x["validation_status"]=="VALID" for x in validated),"database_inserted":"recorded_in_postgresql"}))
            any_success = True
        except Exception as exc:
            if conn is not None and run_started:
                try:
                    finish_run(conn, run_id, "FAILED", 0, 0, 0, 0, 0, 1)
                except Exception:
                    pass
            append_log(ROOT/"LOGS"/"collection_log.csv", {
                "timestamp":datetime.now().isoformat(), "run_id":run_id, "source":source["name"],
                "status":"FAILED", "error_type":type(exc).__name__, "error_message":str(exc),
            })
            print(json.dumps({"run_id":run_id,"source":source["name"],"status":"FAILED","error_type":type(exc).__name__,"error_message":str(exc)}), file=sys.stderr)
        finally:
            if conn is not None:
                conn.close()
    return 0 if any_success else 1


def main(argv=None) -> int:
    parser=argparse.ArgumentParser(description="AIR-INDEX Phase 2 collection runner")
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument("--fixture", action="store_true", help="Use isolated mock fixture data")
    mode.add_argument("--live", action="store_true", help="Use only explicitly authorized LIVE sources")
    parser.add_argument("--environment", choices=["TEST","DEVELOPMENT","PRODUCTION"], help="Override APP_ENV")
    args=parser.parse_args(argv)
    app_env=(args.environment or environment()).upper()
    if args.fixture:
        if app_env == "PRODUCTION":
            parser.error("Fixture mode is forbidden in PRODUCTION")
        summary=run_fixture()
        print(json.dumps(summary, indent=2))
        return 0
    if args.live or os.getenv("COLLECTION_MODE", "fixture").lower()=="live":
        return run_live(app_env)
    parser.error("Explicitly select --fixture for test/development mock runs or --live for authorized production collection.")


if __name__=="__main__":
    raise SystemExit(main())
