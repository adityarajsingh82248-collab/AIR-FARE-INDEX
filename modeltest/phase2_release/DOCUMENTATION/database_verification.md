# AIR-INDEX — Database Verification

This documents the exact commands used to set up, run, and verify PostgreSQL
for this project, based on what was actually executed and verified during the
2026-09-08 audit (see `PHASE_2_COMPLETION.md` for the fixes that made this
possible). Docker is optional (Part 15/25) — a plain local PostgreSQL install
was used here and works fine.

## 1. Database setup (local PostgreSQL, no Docker)

```bash
# Install and start PostgreSQL (Debian/Ubuntu example)
apt-get install -y postgresql
service postgresql start

# Create a dedicated role and database
sudo -u postgres psql -c "CREATE USER air_index WITH PASSWORD 'your-real-password';"
sudo -u postgres psql -c "CREATE DATABASE air_index OWNER air_index;"
```

## 2. Connection

```bash
export DATABASE_URL="postgresql://air_index:your-real-password@localhost:5432/air_index"
pip install "psycopg[binary]" --break-system-packages   # if not already installed
```

## 3. Schema migration / initialization

The schema is a plain `.sql` file applied via `PIPELINE.database_loader.initialize_database`,
not a migration framework. It is idempotent (`CREATE TABLE IF NOT EXISTS`), so
it's safe to call on every run.

```bash
python3 -c "
import psycopg, os
from PIPELINE.database_loader import health_check, initialize_database
conn = psycopg.connect(os.environ['DATABASE_URL'])
assert health_check(conn)
initialize_database(conn)
print('schema ready')
conn.close()
"
```

## 4. Running collection

Fixture mode (safe, no live source, always available):

```bash
python -m PIPELINE.run_collection --fixture
```

Live mode (requires an authorized `LIVE`+`permitted` source in
`CONFIG/sources.yaml`, `DATABASE_URL`, and — for IndiGo — all of
`INDIGO_NDC_SUBSCRIPTION_KEY`/`INDIGO_NDC_USERNAME`/`INDIGO_NDC_PASSWORD`):

```bash
APP_ENV=PRODUCTION COLLECTION_MODE=live python -m PIPELINE.run_collection --live --environment PRODUCTION
```

As of this audit, no source has `status: LIVE`, so this command correctly
exits with `No authorized live source is configured.` (exit code 2) and
touches no data. If a source were marked `LIVE` with incomplete IndiGo
credentials, it now fails at the pre-flight check with
`LIVE SOURCE NOT CONFIGURED / AUTHORIZED` and the specific missing variable
names, before any network or database activity.

## 5. Verification queries

```sql
SELECT COUNT(*) FROM collection_runs;
SELECT COUNT(*) FROM airfare_observations;

SELECT ro.route_code, al.airline_name, so.source_name,
       ob.travel_date, ob.search_date, ob.lead_time_days,
       ob.total_fare, ob.availability, ob.inserted_at
FROM airfare_observations ob
JOIN routes ro ON ro.route_id = ob.route_id
JOIN airlines al ON al.airline_id = ob.airline_id
JOIN sources so ON so.source_id = ob.source_id
ORDER BY ob.inserted_at DESC
LIMIT 10;
```

(`airfare_observations` stores `route_id`/`airline_id`/`source_id` as foreign
keys rather than plain text columns — join `routes`/`airlines`/`sources` as
above to get human-readable route/airline/source names. The insert timestamp
column is `inserted_at`; `collected_timestamp` is the collector's own
observation time, which may differ slightly from when the row was written.)

## 6. What was actually verified in this audit (not claimed, executed)

A local PostgreSQL 16 instance was installed and started in the audit
environment, and the full write path was run end-to-end on a single reused
connection:

```
health_check → initialize_database → start_run → load_batch → finish_run
```

using validated **fixture** rows (clearly not claimed as live airfare) purely
to exercise the write path. This is what surfaced and confirmed the fix for
the connection-closing bug described in `PHASE_2_COMPLETION.md` — every
function had previously used a bare `with conn:`, which psycopg3 closes on
block exit for a non-pooled connection, breaking every call after the first.
After the fix, `collection_runs` and `airfare_observations` both received the
expected row counts on the same open connection, and the failure/rollback
path was confirmed to raise correctly without closing the connection.

**This is DB-wiring verification, not a live airfare observation.** Phase
5/6/21's actual acceptance condition — one genuine IndiGo NDC observation
reaching PostgreSQL — remains unmet, because no authorized IndiGo credentials
are available in this environment. See `manual_setup_checklist.md` for what
that requires.

Docker itself was not runtime-tested in this audit environment (Docker was
not installed in the sandbox) — see `PHASE_2_COMPLETION.md` for that specific
caveat. This does not block Phase 2 acceptance per Part 15/25.
