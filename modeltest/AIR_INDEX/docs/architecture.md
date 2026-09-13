# AIR-INDEX — System Architecture

## 1. High-Level Architecture

```
                         AIR-INDEX
                             |
          +------------------+------------------+
          |                  |                  |
       PHASE 1            PHASE 2           CONFIG
    Data Foundation     Collectors        Routes/Windows
          |                  |            Weights/Sources
          |             Normalization           |
          |                  |                  |
          |             Validation              |
          |                  |                  |
          +-----------> PostgreSQL <------------+
                             |
                             v
                         PHASE 3
                   Statistical Engine
                 +-----------+-----------+
                 |           |           |
               Routes      Windows     Airlines
                 |           |           |
                 +-----------+-----------+
                             |
                             v
                         AIR-INDEX
                   (Base-100 Aggregate)
                             |
                             v
                    Historical Time Series
                             |
                             v
                         PHASE 4
                  Machine Learning Layer
                  +----------+----------+
                  |                     |
             Forecasting          Anomaly Detection
                  |                     |
                  +----------+----------+
                             |
                             v
                         PostgreSQL
                             |
                             v
                          FastAPI
                             |
                             v
                         Dashboard
```

---

## 2. Component Responsibilities

| Phase | Name | Primary Role | Output |
|---|---|---|---|
| **Phase 1** | Data Foundation | Research, canonical definitions, schema, data dictionary, reference data | Data standards & baseline mappings |
| **Phase 2** | Collection & Processing | Authorized scraping, IndiGo NDC integration, normalization, validation, deduplication | Validated canonical airfare observations in PostgreSQL |
| **Phase 3** | Statistical Engine | Representative fare (median), Base-100 indexing, route/window weighting, quality scoring | AIR-INDEX headline & route indices in PostgreSQL |
| **Phase 4** | Machine Learning | Monthly feature generation, baseline & ML forecasting, rolling z-score / IQR anomaly detection | Forecasts, anomaly alerts & model registry |
| **API** | FastAPI Layer | Unified REST API exposing index history, route breakdowns, forecasts, and anomalies | JSON API responses (`/api/v1/...`) |

---

## 3. Data Modes & Provenance

AIR-INDEX enforces explicit labeling of data modes across all components to prevent synthetic or fixture data from being presented as live production data.

- `DEVELOPMENT_SYNTHETIC`: Development datasets used for local testing and methodology development.
- `PHASE2_FIXTURE` / `FIXTURE`: Static verified capture fixtures used for automated unit and edge-case testing.
- `PUBLIC_HISTORICAL`: Legitimate public/historical research datasets.
- `LIVE_API` / `LIVE_NDC` / `AUTHORIZED_SCRAPE`: Authorized live observation feeds.

**Production Rule:** In `PRODUCTION` mode (`APP_ENV=PRODUCTION`), the system fails closed if `DATABASE_URL` is missing or if unauthorized / fixture data sources are attempted.

---

## 4. Route & Weight Configuration

### Prototype Routes (6 Key Domestic Corridors)
1. `DEL-BOM` (Delhi – Mumbai)
2. `DEL-BLR` (Delhi – Bengaluru)
3. `BOM-BLR` (Mumbai – Bengaluru)
4. `DEL-CCU` (Delhi – Kolkata)
5. `BLR-HYD` (Bengaluru – Hyderabad)
6. `MAA-DEL` (Chennai – Delhi)

### Booking Windows (5 Lead Times)
- `T+1`: 1 day advance (urgent/business travel)
- `T+7`: 7 days advance (short-term planning)
- `T+15`: 15 days advance (standard advance)
- `T+30`: 30 days advance (planned leisure)
- `T+45`: 45 days advance (early booking baseline)

### Weight Reconciliation
- Phase 3 uses equal weights ($w_i = \frac{1}{6} \approx 0.1667$ per route) labeled explicitly as `DEVELOPMENT_PROTOTYPE`.
- The configuration supports traffic-proportional weighting when authoritative passenger traffic weights are established.
- Weights must satisfy non-negativity ($w_i \ge 0$) and normalize to unity ($\sum w_i = 1.0$).
