# AIR-INDEX — Phase 2 Final Map

```
AUTHORIZATION
      ↓
CREDENTIALS
      ↓
LIVE SOURCE
      ↓
AIRSHOPPING
      ↓
RAW RESPONSE
      ↓
PARSER
      ↓
NORMALIZATION
      ↓
VALIDATION
      ↓
DUPLICATE CHECK
      ↓
POSTGRESQL
      ↓
RUN LOG
      ↓
SCHEDULER
      ↓
DAILY HISTORY
      ↓
PHASE 3
```

| Step | Status | Owner | Automatable? | Manual? | Blocker? | File |
|---|---|---|---|---|---|---|
| Authorization | NOT STARTED | Team (human) | No | Yes — register as IATA/TIDS agent or 6E-authorized partner, complete certification | **Yes — the actual blocker** | `manual_setup_checklist.md` |
| Credentials | NOT STARTED | Team (human) | No | Yes — obtained only after authorization; stored in local `.env`, never committed | Yes (depends on Authorization) | `.env.example`, `.gitignore` |
| Live source | READY, DISABLED | Coding agent (built) / Team (enables) | Yes (code) / No (the enable decision) | Team decides when to flip `status: LIVE` in `sources.yaml` once real access exists | Yes (depends on Credentials) | `CONFIG/sources.yaml` |
| AirShopping | READY (was broken, now fixed) | Coding agent | Yes | No | No — code path verified buildable; `_collector_for()`'s `timeout_ms` crash is fixed | `COLLECTORS/indigo_ndc_collector.py` |
| Raw response | READY | Coding agent | Yes | No | No | `PIPELINE/raw_ingestion.py` |
| Parser | READY, tested against NDC fixture | Coding agent | Yes | No | No | `COLLECTORS/indigo_ndc_collector.py` (`parse_airshopping_response`), `DATA/sample/indigo_airshopping_response.xml` |
| Normalization | READY | Coding agent | Yes | No | No | `PIPELINE/normalization.py` |
| Validation | READY | Coding agent | Yes | No | No | `PIPELINE/validation.py` |
| Duplicate check | READY | Coding agent | Yes | No | No | `PIPELINE/validation.py` (`classify_duplicates`) |
| PostgreSQL | READY (was broken, now fixed) | Coding agent | Yes | No | No — connection-closing bug fixed and re-verified against a real local PostgreSQL instance in this audit | `PIPELINE/database_loader.py`, `database_verification.md` |
| Run log | READY | Coding agent | Yes | No | No | `PIPELINE/database_loader.py` (`start_run`/`finish_run`), `UTILS/logging.py` |
| Scheduler | READY, fails safe | Coding agent | Yes | No | No — production mode never falls back to fixture | `SCHEDULER/scheduler.py` |
| Daily history | READY (mechanism), EMPTY (data) | Coding agent (mechanism) / Time + live source (data) | Yes (mechanism) | No | Yes (depends on Live source actually running daily) | `PIPELINE/database_loader.py` (append-only inserts, no overwrite) |
| Phase 3 | NOT STARTED — intentionally out of scope | — | — | — | Correctly deferred per Part 23 | — |

## Reading this map

Every step from **AirShopping** through **Scheduler** is engineering-complete
and — as of this audit — verified to actually run, including against a real
PostgreSQL instance rather than only mocks. The chain breaks at the very top:
**Authorization** and **Credentials** are the only two steps that are not
started, and both require a human doing something in the real world (industry
registration, certification, IP whitelisting) rather than more code.

This is why the honest status is **PHASE 2 ENGINEERING COMPLETE — LIVE SOURCE
AUTHORIZATION PENDING**, not PHASE 2 COMPLETE: the pipeline is ready to carry a
real observation the moment Authorization and Credentials exist, but no code
change can produce those two steps.
