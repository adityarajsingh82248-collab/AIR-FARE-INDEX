# AIR-INDEX — Phase 3

Phase 3 is the **index calculation + PostgreSQL + FastAPI** layer for SIH26056. It consumes validated Phase 2 observations and produces route, booking-window, airline analytical, quality, and headline AIR-INDEX results.

## Architecture
`Phase 2 validated observations -> representative fare -> route index -> booking-window index -> airline analytics -> weighted overall index -> quality -> PostgreSQL -> FastAPI -> JSON consumers`

Phase 4 ML/forecasting and Phase 5 dashboard/deployment features are outside this package's scope.

## Representative routes
`DEL-BOM`, `DEL-BLR`, `BOM-BLR`, `DEL-CCU`, `BLR-HYD`, `MAA-DEL`.

## Booking windows
`T+1`, `T+7`, `T+15`, `T+30`, `T+45`.

## Data provenance
The included complete calculation fixture is deterministic **DEVELOPMENT_SYNTHETIC** data. It is for mathematical/integration validation only and is not live or historical evidence. The package never labels synthetic data as live. The historical adapter separately supports a genuinely public historical dataset and labels its output `PUBLIC_HISTORICAL`.

A real-time AIR-INDEX requires genuine authorized Phase 2 observations (`LIVE_API`, `LIVE_NDC`, or `AUTHORIZED_SCRAPE`, as applicable). Test/sandbox API responses are not treated as live.

## Index methodology
- Primary representative fare: median of valid INR `total_fare` observations.
- Base-100: `I_t = (P_t / P_0) * 100`.
- Route index: same route + booking window compared with its configured base-period representative fare.
- Overall window index: route-weighted aggregation using the configured prototype weights.
- Headline AIR-INDEX: arithmetic mean of the available valid booking-window overall indices for the period; `/api/v1/index/latest` returns this `ALL` headline, never an arbitrary T+1 value.
- Airline indices: analytical route/window/airline indices when sample size is sufficient; they are not official national aggregates.
- Quality: sample size, diversity, duplicate/outlier rates and route coverage.

The weights are **development/prototype equal weights**, not official MoSPI/DGCA weights. They are validated to sum to 1 and stored as methodology metadata.

## PostgreSQL
Apply the Phase 2 schema first, then `PHASE_3/DATABASE/phase3_migration.sql`. Phase 3 persists methodology, weights, route indices, window overall indices, headline indices, airline indices and quality metrics. `DATABASE_URL` is the production API source. If it is configured but PostgreSQL is unavailable, the API returns HTTP 503; it does not silently fall back to CSV.

Without `DATABASE_URL`, the API can use the explicitly labelled development synthetic fixture for local development/testing.

## Run

```bash
pip install -r requirements.txt
pytest -q
uvicorn PHASE_3.API.main:app --reload
```

API documentation is available at `/docs` and `/openapi.json` when the server is running.

## Required endpoints
- `GET /api/v1/index/latest`
- `GET /api/v1/index/history`
- `GET /api/v1/index/routes`
- `GET /api/v1/index/routes/{route}`
- `GET /api/v1/index/booking-windows`
- `GET /api/v1/index/airlines`
- `GET /api/v1/observations/latest`
- `GET /api/v1/data-quality`
- `GET /api/v1/health`

## Verification boundary
Phase 3 can be validated with development/public historical data. Genuine live validation remains dependent on authorized Phase 2 sources and their accumulated observations. PostgreSQL runtime success is reported only when an actual PostgreSQL instance is used.

## Production safety
Set `APP_ENV=PRODUCTION` together with `DATABASE_URL` for production API operation. In production, Phase 3 reads persisted PostgreSQL results and accepts only `LIVE_API`, `LIVE_NDC`, or `AUTHORIZED_SCRAPE` data modes. If PostgreSQL is not configured or unavailable, the API fails closed with HTTP 503 rather than using the development CSV fixture.

`PHASE_3/DATABASE/phase3_migration.sql` is the single canonical Phase 3 schema. `PHASE_3/DATABASE/postgresql_schema.sql` is retained only as a compatibility pointer and intentionally contains no duplicate DDL.
