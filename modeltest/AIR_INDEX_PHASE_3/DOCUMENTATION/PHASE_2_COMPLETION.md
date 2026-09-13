# AIR-INDEX — Phase 2 Completion & Second Audit

## Final status

**PHASE 2 ENGINEERING COMPLETE — LIVE SOURCE ACCESS PENDING**

The existing Phase 2 framework was repaired in place. Working components were preserved and the pipeline was tightened around explicit configuration, safe environment separation, raw retention, Phase 1-compatible validation, transaction-safe PostgreSQL loading, source/run lineage, bounded retries, scheduler safety, testing, and reproducibility.

No named airline/OTA source is enabled as `LIVE` in the supplied package. No real airfare observations were collected during this verification. No fake historical series, fake PostgreSQL results, route weights, APIx values, CPI metrics, AI scores, or forecasts were created.

## Verified results

| Metric | Verified result |
|---|---:|
| Planned sources audited | 11 |
| Named production sources enabled | 0 |
| Generic collector adapters | 2 |
| Routes configured | 6 |
| Booking windows configured | 5 |
| Real observations collected | 0 |
| Mock/fixture observations processed | 38 |
| Mock observations valid | 35 |
| Mock observations rejected | 3 |
| Mock exact duplicates | 6 |
| Mock usable-for-index | 32 |
| Actual PostgreSQL production records inserted | 0 |
| Successful live collection runs | 0 |
| Failed live collection runs | 0 |
| Automated tests | 19 |
| Tests passed | 19 |
| Tests failed | 0 |
| Live-mode gate verification | PASSED |
| Production fixture-mode block verification | PASSED |
| Scheduler production fixture rejection | PASSED |
| Configuration validation | PASSED |
| Python compile check | PASSED |
| Docker config runtime check | NOT RUN — Docker unavailable in audit environment |
| PostgreSQL runtime check | NOT RUN — PostgreSQL client/server unavailable in audit environment |

## Fixture verification

The fixture dataset is explicitly marked `MOCK_FIXTURE`, `TEST`, and `is_mock=true`. Each fixture execution also receives a unique `collection_run_id`.

The fixture suite covers:

- AVAILABLE
- SOLD_OUT
- MISSING
- UNKNOWN
- same-timestamp duplicate
- intraday repeat
- fare inconsistency
- invalid date/lead-time
- negative fare
- multiple routes
- all five booking windows
- multiple airlines

The latest fixture run produced 38 observations, 35 valid, 3 rejected, 6 exact duplicate flags, and 32 usable-for-index rows. These are **mock engineering results only**.

## Live-mode verification

Command tested:

```bash
APP_ENV=PRODUCTION COLLECTION_MODE=live python -m PIPELINE.run_collection --live --environment PRODUCTION
```

Result: the runner exits safely with:

```text
No authorized live source is configured.
```

It does not fall back to fixture data, does not create fares, and does not claim collection success.

## Database verification

The schema and loader now include:

- `collection_runs`
- `collection_logs`
- `collection_run_id` lineage
- attempt/valid/rejected/inserted/error counters
- transaction handling and rollback path
- route/airline/source master upserts
- observation metadata fields
- requested PostgreSQL indexes

Actual PostgreSQL connectivity was **not available in the audit environment**, so zero production database records are claimed. The database interface was verified with SQL-contract and transaction-oriented tests instead.

## Source status

The 11 named airline/OTA sources remain permission/audit gated. The source audit records robots/Terms evidence, technical/permission status, and next action. A source is never marked `LIVE` solely because a collector class exists.

## Phase boundary

Phase 2 stops at the reliable airfare observation pipeline. The package does not implement the Phase 3 Airfare Price Index, official route weights, CPI inflation/correlation, final anomaly models, forecasting, or the Phase 3 backtest.

## Ready for Phase 3

The software architecture is ready to begin accumulating a real historical airfare time series as soon as an authorized live source/official permitted interface and a PostgreSQL instance are supplied. The historical time series itself is **not yet available**.

## 2026-09-08 integration update

An authorization-gated IndiGo NDC AirShopping adapter has been added. This is an engineering integration against IndiGo's documented NDC 21.3 interface; it does **not** claim production authorization or live observations. The source remains disabled until authorization, credentials, IP whitelisting and required certification/approval are obtained.

The adapter supports AirShopping request construction, authenticated HTTP calls, token refresh on HTTP 401, XML offer parsing, fare/tax/total extraction, flight metadata extraction, raw payload preservation, and hand-off to the existing validation/database pipeline.

Phase 2 remains `ENGINEERING COMPLETE — LIVE SOURCE AUTHORIZATION PENDING` until a legitimate live credentialed run is successfully executed and verified in PostgreSQL.

## 2026-09-08 audit round — real PostgreSQL testing, two bugs found and fixed

Unlike the prior audit round, PostgreSQL was actually installed and started in the
audit environment this time, so the database layer was exercised against a real
server instead of only SQL-contract/mock tests. This surfaced two defects that
the mocked test suite could not catch, both now fixed with regression tests added:

1. **`_collector_for()` crashed when building `IndigoNDCCollector`.** It passed a
   `timeout_ms` kwarg into `IndigoNDCCollector(**common)`, which forwarded it to
   `BaseCollector.__init__()` — an argument that constructor doesn't accept
   (`TypeError`). This meant a live IndiGo run would have crashed before making a
   single request, even with valid credentials. Fixed by having
   `IndigoNDCCollector.__init__` accept `timeout_ms` explicitly as a fallback
   timeout default (`INDIGO_NDC_TIMEOUT_SECONDS` still takes precedence when set).

2. **`database_loader.py` closed its own connection mid-run.** `initialize_database`,
   `start_run`, `finish_run`, and `load_batch` each wrapped their work in a bare
   `with conn:`. In psycopg3, that commits/rolls back **and then closes** any
   non-pooled connection on block exit. Since `run_live()` reuses one connection
   across all four calls, the very first one (`initialize_database`) silently
   closed it, and every subsequent call failed with
   `psycopg.OperationalError: the connection is closed`. This meant the database
   layer could not have worked end-to-end even with live IndiGo credentials — it
   is not a mocked-test gap, it is a real defect that only shows up against a
   real connection. Fixed by scoping each function with `conn.transaction()`
   instead, which manages the transaction without closing the connection.

A `check_indigo_credentials()` function was also added (module-level, in
`COLLECTORS/indigo_ndc_collector.py`) per the standing requirement for an explicit,
secret-free pre-flight credential check; `run_live()` now calls it for any
`indigo_ndc` LIVE source before attempting collection, and fails closed with
`LIVE SOURCE NOT CONFIGURED / AUTHORIZED` plus the specific missing variable
names if credentials are incomplete — without ever printing their values.

After both fixes, the full sequence
(`health_check → initialize_database → start_run → load_batch → finish_run`) was
re-run against a locally started PostgreSQL 16 instance on a single reused
connection, using clearly-labelled fixture rows (not claimed as live data) purely
to exercise the write path; `collection_runs` and `airfare_observations` received
the expected row counts. This is DB-wiring verification, not a live airfare
observation — Phase 5/6's requirement for a genuine live IndiGo observation in
PostgreSQL remains unmet, since no authorized credentials are available.

`CONFIG/sources.yaml` was not modified: IndiGo NDC remains
`status: AUTHORIZATION_PENDING`, `permitted: false`.

Updated verification counts:

| Metric | Value |
|---|---:|
| Automated tests (before this round) | 21 |
| Automated tests (after this round) | 25 |
| New regression tests added | 4 |
| Real bugs found via live-PostgreSQL testing | 2 |
| Real bugs fixed | 2 |
| Docker runtime check | NOT RUN — Docker unavailable in this audit environment |
| PostgreSQL runtime check | RUN — schema init, run tracking, and batch insert verified against a real local PostgreSQL 16 instance |
| Real live IndiGo NDC observations collected | 0 (unchanged — no authorized credentials available) |
