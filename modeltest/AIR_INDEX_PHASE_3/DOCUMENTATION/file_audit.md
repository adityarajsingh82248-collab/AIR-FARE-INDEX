# AIR-INDEX — File Audit

Verified against the actual code (imports run, tests executed, and — for the
database layer — a real local PostgreSQL instance), not against the prior
completion report's claims. Compiled 2026-09-08.

| File | Status | Problem | Action | Priority |
|---|---|---|---|---|
| `COLLECTORS/base_collector.py` | CORRECT | None found | None | — |
| `COLLECTORS/indigo_ndc_collector.py` | **WAS FAULTY, NOW FIXED** | `IndigoNDCCollector.__init__` forwarded an unexpected `timeout_ms` kwarg straight to `BaseCollector.__init__`, which doesn't accept it — `_collector_for()` crashed building this collector for any LIVE indigo_ndc source | Fixed: `timeout_ms` is now an explicit constructor param used as a fallback timeout; `check_indigo_credentials()` added; per-route retry now uses `self.max_retries` | Done |
| `COLLECTORS/source_1_collector.py` (Playwright) | CORRECT | None found | None | — |
| `COLLECTORS/source_2_collector.py` (HTTP) | CORRECT | None found | None | — |
| `CONFIG/sources.yaml` | CORRECT | None — IndiGo correctly stays `AUTHORIZATION_PENDING`/`permitted: false`; all OTA sources correctly `RESTRICTED`/`DEFERRED` | None — deliberately not modified this round | — |
| `CONFIG/routes.yaml` | CORRECT | None found | None | — |
| `CONFIG/booking_windows.yaml` | CORRECT | None found | None | — |
| `DATABASE/postgresql_schema.sql` | CORRECT | None — schema itself is sound (verified by actually creating it in real PostgreSQL) | None | — |
| `DATABASE/migrations/001_phase2_collection_metadata.sql`, `002_phase2_lineage_index.sql` | OPTIONAL | Not referenced by any Python code — `initialize_database()` applies the full schema file directly rather than a migration chain, so these appear to be historical/manual-reference migrations rather than an active migration path | Document as reference-only, or wire into a real migration runner if the team wants incremental migrations later | Low |
| `PIPELINE/run_collection.py` | **WAS FAULTY, NOW FIXED** | `_collector_for()` passed `timeout_ms` into `IndigoNDCCollector(**common)` (see above) | Fixed. Also added an upfront `check_indigo_credentials()` pre-flight check before attempting any LIVE indigo_ndc collection | Done |
| `PIPELINE/raw_ingestion.py` | CORRECT | None found | None | — |
| `PIPELINE/normalization.py` | CORRECT | None found | None | — |
| `PIPELINE/validation.py` | CORRECT | None found | None | — |
| `PIPELINE/database_loader.py` | **WAS FAULTY, NOW FIXED — HIGH SEVERITY** | Every function (`initialize_database`, `start_run`, `finish_run`, `load_batch`) scoped its work with a bare `with conn:`. psycopg3 closes any non-pooled connection on block exit, so the *first* call silently closed the shared connection and every subsequent call in the same live run failed with `OperationalError: the connection is closed`. Verified by actually running against real PostgreSQL — the mocked test suite could not have caught this | Fixed: all four functions now use `conn.transaction()`, which scopes the transaction without closing the connection. Re-verified end-to-end against a real database on a single reused connection | Done |
| `PIPELINE/process_observations.py` | CORRECT | None found | None | — |
| `PIPELINE/config.py` | CORRECT | None found | None | — |
| `SCHEDULER/scheduler.py` | CORRECT | None — production mode never falls back from LIVE to FIXTURE | None | — |
| `UTILS/logging.py` | CORRECT | None found | None | — |
| `UTILS/retry.py` | NEEDS MODIFICATION (minor, not yet done) | The generic `retry()` decorator is defined but never imported/used anywhere in the codebase — each collector implements its own retry loop instead | Low-priority cleanup: either wire this into the collectors for a single shared retry implementation, or remove it and document that per-collector retry loops are the intended pattern | Low |
| `UTILS/timestamps.py` | CORRECT | None found | None | — |
| `TESTS/test_collectors.py` | UPDATED | Previously had no coverage for `_collector_for()` actually building an `IndigoNDCCollector` — the exact path that crashed | Added `test_collector_for_builds_indigo_ndc_collector_without_crashing` as a regression test | Done |
| `TESTS/test_database.py` | UPDATED | `FakeConn`/`FailingConn` mocks didn't model psycopg3's real connection-closing behavior, which is exactly why the `with conn:` bug went undetected | Added a `transaction()` method to the fakes that mirrors real psycopg3 semantics, plus `closed` assertions in both existing tests | Done |
| `TESTS/test_indigo_ndc.py` | UPDATED | No coverage for the new `check_indigo_credentials()` function | Added three tests: reports each missing var, passes when all present, never leaks values | Done |
| `TESTS/test_config_and_modes.py` | CORRECT | None found — still passes unchanged | None | — |
| `TESTS/test_fixture_edges.py` | CORRECT | None found | None | — |
| `TESTS/test_normalization.py` | CORRECT | None found | None | — |
| `TESTS/test_utils.py` | CORRECT | None found | None | — |
| `TESTS/test_validation.py` | CORRECT | None found | None | — |
| `DATA/raw/fixture_raw.jsonl`, `DATA/processed/fixture_validated.csv` | CORRECT (generated) | None — regenerated fresh during this audit, matches documented fixture counts (38/35/3/6/32) | None | — |
| `DATA/sample/indigo_airshopping_response.xml` | CORRECT | NDC AirShopping fixture used by `TESTS/test_indigo_ndc.py`; parses correctly | None | — |
| `DATA/sample/*.csv` (Phase 1 reference files) | CORRECT | None found | None | — |
| `README.md` | UPDATED | Didn't yet point to this round's new documentation files | Added a "Further documentation" section linking `manual_setup_checklist.md`, `manual_dependencies.md`, `source_feasibility.md`, `database_verification.md`, `PHASE_2_FINAL_MAP.md`, `file_audit.md`, and `PHASE_2_COMPLETION.md` | Done |
| `DOCUMENTATION/PHASE_2_COMPLETION.md` | UPDATED | Was stale: claimed "PostgreSQL runtime check NOT RUN" and a 19-test baseline that didn't match the actual 21-test suite | Added a dated section covering this round's two bug fixes and the updated test count (25) | Done |
| `DOCUMENTATION/PHASE_2_AUDIT_MATRIX.md` | CORRECT (historical) | None found — reflects an earlier audit round, still internally consistent | None | — |
| `DOCUMENTATION/collection_methodology.md` | CORRECT | None found | None | — |
| `DOCUMENTATION/schema_documentation.md` | CORRECT | None found | None | — |
| `DOCUMENTATION/source_audit.csv` | CORRECT | None found — robots.txt/Terms findings for the 11 OTA/airline websites are sound and unchanged | None | — |
| `DOCUMENTATION/source_feasibility.md` | ADDED | Did not exist (Part 9 requirement) | Created — extends `source_audit.csv` with IndiGo/Air India NDC, DGCA, and MoSPI, grounded in each source's own published material | Done |
| `DOCUMENTATION/manual_dependencies.md` | ADDED | Did not exist (Part 10 requirement) | Created | Done |
| `DOCUMENTATION/manual_setup_checklist.md` | ADDED | Did not exist (Part 11 requirement) | Created, grounded in IndiGo's own FAQ (eligibility, IP whitelist limits, certification process) | Done |
| `DOCUMENTATION/database_verification.md` | ADDED | Did not exist (Part 16 requirement) | Created with commands actually run and verified against real PostgreSQL in this audit | Done |
| `DOCUMENTATION/PHASE_2_FINAL_MAP.md` | ADDED | Did not exist (Part 24 requirement) | Created | Done |
| `.env.example` | CORRECT | Placeholders only (`CHANGE_ME`), as required — no real secrets | None | — |
| `.gitignore` | **MISSING, NOW ADDED** | Did not exist anywhere in the package — nothing was actually stopping a real `.env` from being committed alongside `.env.example` | Added, covering `.env`, Python artifacts, and generated data/log output | Done |
| `DOCKER/Dockerfile`, `DOCKER/docker-compose.yml` | CORRECT (config only) | Sound configuration (no hardcoded secrets, `POSTGRES_PASSWORD` required via `:?`, production defaults to `live` mode which fails safely with no fixture fallback) — but Docker itself could not be runtime-tested (not installed in this audit's sandbox) | None to the config; runtime verification remains open | Medium (only if the team needs Docker specifically — Part 15/25 says this doesn't block acceptance) |

## Summary

- **0 files missing** that Part 2 requires — everything on that list exists
- **2 files were faulty** in a way that would have broken a real live run —
  both fixed and covered by new regression tests (see
  `PHASE_2_COMPLETION.md` for the technical detail)
- **1 file was genuinely missing** outside Part 2's list but still required by
  the project's own stated rules — `.gitignore` — added
- **5 documentation files added** per Parts 9/10/11/16/24
- **0 files deleted or judged unnecessary** — the migrations directory is
  flagged as optional/reference rather than removed, since deleting it isn't
  clearly warranted and the task's own instructions favor preserving existing
  files absent a strong reason
