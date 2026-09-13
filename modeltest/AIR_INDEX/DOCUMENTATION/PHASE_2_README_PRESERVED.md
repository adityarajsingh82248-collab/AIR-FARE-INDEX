# AIR-INDEX — Phase 2 Automated Data Collection

## Purpose
Phase 2 turns the Phase 1 airfare schema into a repeatable collection pipeline:

`authorized source -> collector -> raw -> normalize -> validate -> deduplicate -> PostgreSQL`

Phase 2 does **not** calculate APIx, route weights, CPI inflation/correlation, final anomaly scores, or forecasting.

## Environment modes

- `TEST`: fixture data only.
- `DEVELOPMENT`: fixture data by default; live mode only for explicitly authorized sources.
- `PRODUCTION`: live mode only; fixture mode is rejected.

Mock rows carry `is_mock=true`, `data_mode=FIXTURE`, and `environment=TEST`. They are stored under fixture/sample paths and are never treated as production observations.

## Install

```bash
cd PHASE_2
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

## Configuration

Routes: `CONFIG/routes.yaml`  
Booking windows: `CONFIG/booking_windows.yaml`  
Sources: `CONFIG/sources.yaml`  
Environment: `.env` / environment variables

Every source must declare its access method, permission status, request delay, timeout, retry count, and implementation status. A source may be `LIVE` only when `permitted: true` and authorization/approved interface access has been documented.

The current package deliberately leaves the planned named sources disabled until authorization is established. No selector profile is invented for a restricted or unverified source.

## Fixture/test execution

```bash
APP_ENV=TEST COLLECTION_MODE=fixture python -m PIPELINE.run_collection --fixture --environment TEST
pytest -q
```

Fixture execution writes:
- `DATA/raw/fixture_raw.jsonl`
- `DATA/processed/fixture_validated.csv`
- `LOGS/fixture_run_summary.json`

These are mock artifacts only.

## Live execution

```bash
APP_ENV=PRODUCTION COLLECTION_MODE=live python -m PIPELINE.run_collection --live --environment PRODUCTION
```

When no authorized LIVE source exists, the runner exits non-zero with:

`No authorized live source is configured.`

It does not fall back to fixture data and does not insert mock data.

## Database

Set `DATABASE_URL` to an actual PostgreSQL instance, then initialize the schema:

```bash
psql "$DATABASE_URL" -f DATABASE/postgresql_schema.sql
```

Apply later migrations as needed:

```bash
psql "$DATABASE_URL" -f DATABASE/migrations/001_phase2_collection_metadata.sql
```

Database helpers in `PIPELINE/database_loader.py` provide health check, schema initialization, transaction-safe run tracking, master upserts, and batch loading. PostgreSQL is not claimed as connected unless an actual instance is available.

## Scheduler

The scheduler defaults to production-safe live mode:

```bash
APP_ENV=PRODUCTION COLLECTION_MODE=live python SCHEDULER/scheduler.py
```

For development fixture scheduling:

```bash
APP_ENV=DEVELOPMENT COLLECTION_MODE=fixture python SCHEDULER/scheduler.py
```

The production scheduler never silently switches to fixture data.

## Testing

```bash
pytest -q
```

The suite covers configuration validation, booking windows, lead time, normalization, fare consistency, availability, duplicate/intraday handling, fixture/live separation, retry bounds, collector permission gates, database SQL contracts, and scheduler mode safety.

## Ethical collection policy

Only publicly accessible and permitted interfaces may be automated. Do not bypass CAPTCHA, authentication, anti-bot controls, robots restrictions, rate limits, or Terms of Service. Use bounded retries and configurable request delays. Keep raw observations for debugging and preserve source/run lineage.

## Current limitation

This package contains no verified live airfare observations. The named airline/OTA sources remain permission/audit gated. Live historical accumulation is therefore pending an authorized source or officially approved interface.

## Authorized IndiGo NDC integration

Phase 2 now includes an **authorization-gated IndiGo NDC AirShopping adapter** in `COLLECTORS/indigo_ndc_collector.py`.

The adapter targets IndiGo's documented NDC 21.3 AirShopping interface and preserves the existing Phase 2 flow:

`AirShopping -> raw response -> normalization -> validation -> PostgreSQL`

It is intentionally **disabled by default** (`permitted: false`, `status: AUTHORIZATION_PENDING`). Production use requires legitimate IndiGo NDC onboarding, credentials, IP whitelisting and the certification/approval required by IndiGo. No website scraping or restriction bypassing is implemented.

Environment variables are listed in `.env.example`. Never commit credentials.

## Further documentation

- `DOCUMENTATION/manual_setup_checklist.md` — the concrete, human-only tasks
  standing between this codebase and a real IndiGo/Air India observation
  (registration, certification, IP whitelisting)
- `DOCUMENTATION/manual_dependencies.md` — what a coding agent can and cannot
  legitimately do on this project
- `DOCUMENTATION/source_feasibility.md` — feasibility matrix covering IndiGo,
  Air India, the audited OTA/airline websites, DGCA, and MoSPI
- `DOCUMENTATION/database_verification.md` — exact commands to stand up
  PostgreSQL and verify collection end-to-end
- `DOCUMENTATION/PHASE_2_FINAL_MAP.md` — step-by-step pipeline status from
  authorization through to Phase 3
- `DOCUMENTATION/file_audit.md` — per-file status from the latest audit round
- `DOCUMENTATION/PHASE_2_COMPLETION.md` — dated verification log, including
  two bugs found and fixed by testing against a real local PostgreSQL instance
