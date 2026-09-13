# AIR-INDEX — REST API Documentation

## 1. Overview

The AIR-INDEX REST API is built with FastAPI and provides high-performance, strongly typed access to real-time and historical airfare indices, route breakdowns, data quality metrics, machine learning forecasts, and anomaly detection reports.

Base URL: `http://localhost:8000/api/v1`
Interactive OpenAPI Docs: `http://localhost:8000/docs`
OpenAPI JSON Schema: `http://localhost:8000/openapi.json`

---

## 2. API Endpoints

### System & Health

#### `GET /api/v1/health`
Checks API status and PostgreSQL connectivity.
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "api": "healthy",
    "database": "connected",
    "data_source": "DEVELOPMENT_SYNTHETIC"
  }
}
```

---

### Index & Statistical Engine Endpoints (Phase 3)

#### `GET /api/v1/index/latest`
Returns the most recent Headline AIR-INDEX value across all routes.

#### `GET /api/v1/index/history`
Returns historical headline and booking-window indices with optional filtering.
- **Parameters:**
  - `start_date` (string, ISO date): Filter periods $\ge$ `start_date`
  - `end_date` (string, ISO date): Filter periods $\le$ `end_date`
  - `booking_window` (string): Filter booking window (`T+1`, `T+7`, `T+15`, `T+30`, `T+45`)

#### `GET /api/v1/index/routes`
Returns index values broken down by route and booking window.

#### `GET /api/v1/index/routes/{route}`
Returns index history for a specific route (e.g., `DEL-BOM`).

#### `GET /api/v1/index/booking-windows`
Returns aggregate index breakdown across lead times (`T+1` through `T+45`).

#### `GET /api/v1/index/airlines`
Returns airline-level fare indices and sample counts.

#### `GET /api/v1/observations/latest`
Returns latest validated canonical observations.

#### `GET /api/v1/data-quality`
Returns overall composite data quality scores and route coverage statistics.

---

### Machine Learning & Anomaly Endpoints (Phase 4)

#### `GET /api/v1/forecast/latest`
Returns the next-period headline AIR-INDEX forecast from the active trained model.
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "forecast": 107.55,
    "model": "naive_previous_value",
    "horizon": "next_period_monthly",
    "data_mode": "DEVELOPMENT_SYNTHETIC"
  }
}
```

#### `GET /api/v1/forecast/{horizon}`
Returns multi-step forecasts for $h$ months ahead ($1 \le h \le 12$).
- **Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "forecasts": [
      {"horizon_month": 1, "predicted_value": 107.55},
      {"horizon_month": 2, "predicted_value": 107.55}
    ],
    "model": "naive_previous_value",
    "data_mode": "DEVELOPMENT_SYNTHETIC"
  }
}
```

#### `GET /api/v1/anomalies`
Returns all detected statistical anomalies across headline and route indices.

#### `GET /api/v1/anomalies/latest`
Returns anomalies detected specifically in the most recent observation period.

#### `GET /api/v1/models`
Returns list of registered ML model artifacts, versions, and training dates.

#### `GET /api/v1/model-performance`
Returns evaluation metrics (MAE, RMSE, sMAPE) and baseline comparisons for registered models.

---

## 3. Error Handling

The API adheres to strict HTTP status codes:
- `200 OK`: Successful request with computed data.
- `404 Not Found`: Requested resource, route, or model does not exist.
- `422 Unprocessable Entity`: Validation failure (invalid route code, non-existent booking window, invalid date range).
- `503 Service Unavailable`: PostgreSQL connection failure or missing database in `PRODUCTION` mode.
