"""PostgreSQL integration with transactions, master upserts and run bookkeeping.

IMPORTANT: use `with conn.transaction():` for scoping, never bare `with conn:`.
psycopg3's Connection.__exit__ closes any non-pooled connection on block exit
(commit/rollback THEN close) -- see psycopg.Connection.__exit__ source. Since
callers reuse one connection across initialize_database/start_run/load_batch/
finish_run, a bare `with conn:` in any one of them silently closes the
connection and breaks every call after it with "the connection is closed".
`conn.transaction()` manages the transaction only and leaves the connection open.
"""
from __future__ import annotations
from datetime import datetime
import os

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "DATABASE", "postgresql_schema.sql")


def health_check(conn) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1")
        return cur.fetchone()[0] == 1


def initialize_database(conn) -> None:
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        raw = f.read()
    # Strip full-line SQL comments BEFORE splitting on ';'. A comment can itself
    # contain a semicolon (e.g. "-- ...fabricated; they remain..."), and splitting
    # first would cut a comment into its own fragment plus a corrupted statement.
    cleaned = "\n".join(
        line for line in raw.splitlines() if not line.strip().startswith("--")
    )
    statements = [s.strip() for s in cleaned.split(";") if s.strip()]
    with conn.transaction():
        with conn.cursor() as cur:
            for statement in statements:
                cur.execute(statement)


def start_run(conn, run_id: str, source: str, started_at: datetime) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO collection_runs
                (run_id,started_at,source,status) VALUES (%s,%s,%s,%s)
                ON CONFLICT (run_id) DO NOTHING""",
                (run_id, started_at, source, "RUNNING"),
            )


def _upsert_masters(cur, observations: list[dict], source: str) -> None:
    routes = {(o["origin"], o["destination"]) for o in observations if o.get("origin") and o.get("destination")}
    airlines = {o["airline"] for o in observations if o.get("airline")}
    for origin, destination in routes:
        cur.execute(
            "INSERT INTO routes(origin,destination) VALUES (%s,%s) ON CONFLICT(origin,destination) DO NOTHING",
            (origin, destination),
        )
    for airline in airlines:
        cur.execute(
            "INSERT INTO airlines(airline_name) VALUES (%s) ON CONFLICT(airline_name) DO NOTHING",
            (airline,),
        )
    cur.execute(
        "INSERT INTO sources(source_name) VALUES (%s) ON CONFLICT(source_name) DO NOTHING",
        (source,),
    )


def finish_run(conn, run_id: str, status: str, attempted: int, collected: int, valid: int, rejected: int, inserted: int, errors: int) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE collection_runs SET finished_at=now(), status=%s,
                records_attempted=%s, records_collected=%s, records_valid=%s,
                records_rejected=%s, records_inserted=%s, error_count=%s
                WHERE run_id=%s""",
                (status,attempted,collected,valid,rejected,inserted,errors,run_id),
            )


def load_batch(conn, observations: list[dict], run_id: str, source: str, started_at: datetime, error_count: int = 0):
    valid_rows = [o for o in observations if o.get("validation_status") == "VALID"]
    rejected = len(observations) - len(valid_rows)
    inserted = 0
    status = "SUCCESS"
    try:
        with conn.transaction():
            with conn.cursor() as cur:
                _upsert_masters(cur, valid_rows, source)
                for o in valid_rows:
                    cur.execute(
                        """INSERT INTO airfare_observations
                        (observation_id,route_id,airline_id,source_id,travel_date,search_date,search_time,
                        lead_time_label,lead_time_days,fare_class,base_fare,taxes,fees,total_fare,availability,
                        usable_for_index,fare_consistency_flag,validation_status,validation_reason,duplicate_flag,
                        outlier_flag,collected_timestamp,collection_run_id,source_url,collector_name,currency,
                        flight_number,departure_time,arrival_time,duration,stops)
                        VALUES (%s,(SELECT route_id FROM routes WHERE route_code=%s),
                        (SELECT airline_id FROM airlines WHERE airline_name=%s),
                        (SELECT source_id FROM sources WHERE source_name=%s),
                        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                        (
                            o["observation_id"], o["route"], o["airline"], source,
                            o["travel_date"],o["search_date"],o["search_time"],o["lead_time"],o["lead_time_days"],
                            o["fare_class"],o.get("base_fare"),o.get("taxes"),o.get("fees"),o.get("total_fare"),
                            o["availability"],o["usable_for_index"],o["fare_consistency_flag"],o["validation_status"],
                            o.get("validation_reason"),o.get("duplicate_flag","UNIQUE"),o.get("outlier_flag","NORMAL"),
                            o["timestamp"],o.get("collection_run_id",run_id),o.get("source_url"),o.get("collector_name"),
                            o.get("currency","INR"),o.get("flight_number"),o.get("departure_time"),o.get("arrival_time"),
                            o.get("duration"),o.get("stops"),
                        ),
                    )
                    inserted += cur.rowcount
        status = "PARTIAL_SUCCESS" if rejected or error_count else "SUCCESS"
        finish_run(conn, run_id, status, len(observations), len(observations), len(valid_rows), rejected, inserted, error_count)
        return inserted
    except Exception:
        try:
            conn.rollback()
        finally:
            try:
                finish_run(conn, run_id, "FAILED", len(observations), len(observations), len(valid_rows), rejected, 0, max(1,error_count))
            except Exception:
                pass
        raise
