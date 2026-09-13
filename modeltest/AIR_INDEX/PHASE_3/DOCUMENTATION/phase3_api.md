# Phase 3 API

Run from the repository root:

```bash
uvicorn PHASE_3.API.main:app --reload
```

### Index
- `GET /api/v1/index/latest` — current headline AIR-INDEX (`booking_window=ALL`).
- `GET /api/v1/index/history?start_date=&end_date=&booking_window=` — window-level overall history with optional ISO-date/window filters.
- `GET /api/v1/index/routes?booking_window=` — route/window indices.
- `GET /api/v1/index/routes/{route}?booking_window=` — one configured route.
- `GET /api/v1/index/booking-windows` — all window-level overall indices.
- `GET /api/v1/index/airlines?route=&airline=&booking_window=` — analytical airline indices.

### Data and quality
- `GET /api/v1/observations/latest` — latest 50 observations from PostgreSQL when configured, otherwise development fixture rows.
- `GET /api/v1/data-quality` — route/window quality metrics.
- `GET /api/v1/health` — API and PostgreSQL availability status.

### OpenAPI
- `/docs`
- `/openapi.json`

When `DATABASE_URL` is configured, PostgreSQL is authoritative. A configured but unavailable database returns HTTP 503 for database-backed API operations; stale CSV data is not silently substituted.
