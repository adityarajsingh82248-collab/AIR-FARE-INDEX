# AIR-INDEX Phase 3 — Audit and Repair Report

## 1. Audit summary

| Problem | Severity | Fixed? | File(s) Changed | Verification |
|---|---|---|---|---|
| Bundled Phase 3 data was labelled `PUBLIC_HISTORICAL` even though it was a project demo fixture | Critical | Yes | `PHASE_3/DATA/development_observations.csv`, `PHASE_3/DOCUMENTATION/phase3_data_sources.md`, `PHASE_3/DOCUMENTATION/phase3_methodology.md` | Provenance tests; fixture is `DEVELOPMENT_SYNTHETIC` |
| Development fixture covered only 2/6 routes and 2/5 windows | High | Yes | `PHASE_3/DATA/development_observations.csv` | 6 routes × 5 windows × 3 airlines × 3 observations × 2 periods |
| `/index/latest` returned a window-level row and could effectively select T+1 rather than a headline | Critical | Yes | `PHASE_3/INDEX_ENGINE/aggregate_index.py`, `pipeline.py`, `API/main.py` | API test asserts `booking_window=ALL` |
| Overall quality was hardcoded and did not reflect route coverage | High | Yes | `quality.py`, `aggregate_index.py` | Partial-coverage quality test |
| Airline index sample grouping was too shallow and did not reliably reach the configured minimum sample size | High | Yes | synthetic data, `airline_index.py` | Airline grouping test |
| PostgreSQL existed but API calculations were sourced from CSV even when `DATABASE_URL` was configured | Critical | Yes | `API/main.py`, `API/store.py`, `phase2_db_adapter.py`, `run_index.py` | Configured DB failure returns 503; DB integration test provided |
| Phase 3 persistence omitted headline, airline and quality result persistence | High | Yes | `API/store.py`, `phase3_migration.sql` | Schema contract + optional real-PostgreSQL integration test |
| Methodology metadata did not retain all required configuration | Medium | Yes | `methodology.py`, `phase3_migration.sql` | Metadata and schema contract |
| Route weights were not validated against the configured representative routes | Medium | Yes | `weighting.py`, `pipeline.py` | Weight tests |
| API parameter validation was shallow | Medium | Yes | `API/main.py` | Invalid route/window/date tests |
| Phase 2 observations lacked a persisted `data_mode` field, preventing reliable Phase 3 provenance | High | Yes | `DATABASE/postgresql_schema.sql`, `DATABASE/migrations/002_phase2_lineage_index.sql`, `PIPELINE/database_loader.py`, `PIPELINE/run_collection.py` | Schema/test suite; live modes fail closed behind authorization gates |

## 2. Files created

- `DOCUMENTATION/PHASE_2_README_PRESERVED.md`
- `PHASE_3/INDEX_ENGINE/phase2_db_adapter.py`
- `PHASE_3/run_index.py`
- `PHASE_3/TESTS/test_database_contract.py`
- `PHASE_3/TESTS/test_database_integration.py`
- `PHASE_3/TESTS/test_db_adapter.py`
- `PHASE_3/TESTS/test_provenance.py`
- `PHASE_3/DOCUMENTATION/phase3_audit_report.md`
- `pytest.ini`

## 3. Files modified

- `README.md`
- `README_PHASE_3.md`
- `DATABASE/postgresql_schema.sql`
- `DATABASE/migrations/002_phase2_lineage_index.sql`
- `PIPELINE/database_loader.py`
- `PIPELINE/run_collection.py`
- `PHASE_3/API/main.py`
- `PHASE_3/API/schemas.py`
- `PHASE_3/API/store.py`
- `PHASE_3/DATA/development_observations.csv`
- `PHASE_3/DATABASE/phase3_migration.sql`
- `PHASE_3/DOCUMENTATION/phase3_api.md`
- `PHASE_3/DOCUMENTATION/phase3_completion.md`
- `PHASE_3/DOCUMENTATION/phase3_data_sources.md`
- `PHASE_3/DOCUMENTATION/phase3_methodology.md`
- `PHASE_3/INDEX_ENGINE/aggregate_index.py`
- `PHASE_3/INDEX_ENGINE/airline_index.py`
- `PHASE_3/INDEX_ENGINE/methodology.py`
- `PHASE_3/INDEX_ENGINE/pipeline.py`
- `PHASE_3/INDEX_ENGINE/quality.py`
- `PHASE_3/INDEX_ENGINE/route_index.py`
- `PHASE_3/INDEX_ENGINE/weighting.py`
- `PHASE_3/TESTS/test_api.py`
- `PHASE_3/TESTS/test_index_engine.py`
- `PHASE_3/TESTS/test_pipeline.py`

## 4. Files preserved

The Phase 2 collectors, authorization gates, NDC implementation, validation/normalization pipeline, raw/processed fixture architecture, scheduler, and existing Phase 2 database structure were preserved. Only minimal Phase 2 compatibility changes were made to carry explicit `data_mode` into PostgreSQL and to map authorized live collection modes to `LIVE_NDC` or `AUTHORIZED_SCRAPE` rather than an ambiguous `LIVE` label.

## 5. Index methodology

- **Representative fare:** median of valid INR `total_fare`; fare summaries retain mean/median/min/max/count.
- **Base-100:** `I_t = (P_t / P_0) × 100`.
- **Route index:** representative fare for a route/window/month divided by the same route/window's base-period representative fare × 100.
- **Booking-window index:** independently calculated for T+1, T+7, T+15, T+30 and T+45.
- **Airline analytics:** route/window/airline analytical indices with explicit insufficient-data status when the minimum sample is not met.
- **Weights:** six-route equal-weight development/prototype configuration; validated to sum to 1 and explicitly not official government weights.
- **Overall window index:** configured route-weighted average of valid route indices.
- **Headline AIR-INDEX:** arithmetic mean of available valid booking-window overall indices for the period, reported as `booking_window=ALL`. This is what `/api/v1/index/latest` returns.
- **Quality:** sample size, diversity, duplicate/outlier rates and route coverage; thresholds are configurable.

## 6. Database

Phase 3 persistence includes:

- `index_methodology`
- `index_weights`
- `route_indices`
- `overall_indices`
- `headline_indices`
- `airline_indices`
- `index_quality`

Phase 2 `airfare_observations` remains the input layer. Monthly Phase 3 periods are stored as PostgreSQL `DATE` values using the first day of the month (`YYYY-MM-01`).

## 7. API

- `GET /api/v1/index/latest` — headline AIR-INDEX.
- `GET /api/v1/index/history` — window-level overall history with date/window filters.
- `GET /api/v1/index/routes` — route indices.
- `GET /api/v1/index/routes/{route}` — route-specific index history.
- `GET /api/v1/index/booking-windows` — all booking-window overall indices.
- `GET /api/v1/index/airlines` — analytical airline indices.
- `GET /api/v1/observations/latest` — latest Phase 2 observations from PostgreSQL when configured, development fixture otherwise.
- `GET /api/v1/data-quality` — quality metrics.
- `GET /api/v1/health` — API/database health.
- `/docs` and `/openapi.json` — FastAPI documentation.

When `DATABASE_URL` is configured, PostgreSQL is authoritative. A database connection failure returns HTTP 503 instead of silently serving stale CSV data.

## 8. Test results

Final source-tree verification:

- **TOTAL TESTS:** 44
- **PASSED:** 43
- **FAILED:** 0
- **SKIPPED:** 1
- **Python compilation:** PASS (`python -m compileall -q .`)
- **API smoke test:** PASS; all required endpoints plus `/docs` and `/openapi.json` returned HTTP 200 in development-fallback mode.
- **PostgreSQL runtime:** NOT CLAIMED; no PostgreSQL instance was available for this verification run.
- **PostgreSQL integration test:** present and correctly skipped because `DATABASE_URL` was not configured.

## 9. Data status

- **Development data:** YES — deterministic `DEVELOPMENT_SYNTHETIC` fixture included.
- **Public historical data:** YES — historical adapter and documented external public dataset support; no external dataset is bundled as if it were collected by this project.
- **Authorized API test data:** NO — no authorized live API response is bundled or represented as live.
- **Genuine live data:** NO.

## 10. Remaining limitations

- Genuine authorized Phase 2 live observations are still required for real-time validation.
- A real historical accumulation suitable for an official production index remains outside the included synthetic fixture.
- PostgreSQL runtime was not available in the final verification environment, so database runtime success is not claimed.
- Production deployment, monitoring, official government weights, and Phase 4/5 functionality remain outside this Phase 3 package.

## 11. Final status

**PHASE 3 VERIFIED — READY FOR AUTHORIZED PHASE 2 LIVE DATA**

This status means the Phase 3 engineering/calculation layer and its development validation are complete; it does not mean that a live real-time AIR-INDEX is currently operating.
