# AIR-INDEX — Integration Guide

## 1. Unified Project Structure

The unified repository structure brings together Phase 1 (Data Foundation), Phase 2 (Data Collection), Phase 3 (Statistical Engine), and Phase 4 (Machine Learning & Forecasting):

```
AIR_INDEX/
├── COLLECTORS/         # Phase 2: Source collectors (IndiGo NDC, API adapters)
├── CONFIG/             # Shared route, window, and source definitions
├── DATA/               # Raw, processed, and sample datasets
├── DATABASE/           # Phase 2 database schema and migrations
├── DOCKER/             # Containerization setup
├── DOCUMENTATION/      # Phase 2/3 preserved audit and methodology notes
├── LOGS/               # Pipeline execution logs
├── PHASE_3/            # Phase 3: Statistical Index Engine & FastAPI
│   ├── API/            # REST API endpoints (Phases 3 and 4 integrated)
│   ├── CONFIG/         # Weight configurations and methodology rules
│   ├── DATA/           # Development observations
│   ├── DATABASE/       # PostgreSQL schema and Phase 3 migrations
│   ├── DATA_ADAPTERS/  # Historical and fixture dataset adapters
│   ├── INDEX_ENGINE/   # Representative fare, Base-100, weighting, aggregation
│   └── TESTS/          # Phase 3 unit and contract tests
├── PIPELINE/           # Phase 2: Normalization, validation, database loader
├── SCHEDULER/          # Phase 2: Collection scheduling
├── TESTS/              # Phase 2 tests & End-to-End integration tests
├── UTILS/              # Logging, timestamps, retry helpers
├── docs/               # Unified system documentation (architecture, ML, lineage, API)
├── phase1/             # Phase 1: Data foundation, schema, data dictionary, research
├── phase4/             # Phase 4: Feature engineering, forecasting, anomaly detection
│   ├── anomaly_detection/ # Z-score and IQR anomaly detectors
│   ├── config/            # Phase 4 ML configuration
│   ├── database/          # Phase 4 database migrations
│   ├── evaluation/        # MAE, RMSE, sMAPE metrics
│   ├── features/          # Feature pipeline and chronological splitter
│   ├── forecasting/       # Naive, MA, and ML regressors
│   ├── inference/         # Model prediction service
│   ├── models/            # Saved model artifacts and metadata
│   ├── tests/             # Phase 4 unit and integration tests
│   └── training/          # Training pipeline entry point
├── shared/             # Shared configuration access
├── pytest.ini          # Test runner configuration
├── requirements.txt    # Project dependencies
└── README.md           # Master documentation
```

---

## 2. Integration Interfaces

### Interface A: Phase 2 → PostgreSQL
Phase 2 collectors produce raw JSON/XML which is normalized and validated into canonical observation records adhering to the standard schema:
```python
{
    "observation_id": str,
    "origin": str,
    "destination": str,
    "route": str,
    "airline": str,
    "travel_date": date,
    "search_date": date,
    "search_time": time,
    "lead_time": str,  # "T+1", "T+7", etc.
    "lead_time_days": int,
    "fare_class": str,
    "base_fare": float,
    "taxes": float,
    "fees": float,
    "total_fare": float,
    "currency": str,
    "availability": str,
    "source": str,
    "timestamp": datetime,
    "data_mode": str,
    "validation_status": str,
    "usable_for_index": bool,
}
```

### Interface B: PostgreSQL → Phase 3 Index Engine
Phase 3 reads validated observations (`usable_for_index = True`) and applies:
1. Median representative fare calculation across booking windows and routes.
2. Base-100 index calculation relative to reference base period.
3. Weighted aggregation across routes to yield the Headline AIR-INDEX.
4. Output schema matches `headline_indices`, `route_indices`, `overall_indices`, and `airline_indices`.

### Interface C: Phase 3 Index History → Phase 4 ML
Phase 4 consumes the computed headline and route index time series:
1. `load_index_series(headline_indices)` converts time series to sorted feature frames.
2. `build_feature_dataset(headline_indices, route_indices)` adds temporal, lag, rolling, momentum, and quality features.
3. Chronological splitting ensures no data leakage.
4. Models generate next-period forecasts and rolling Z-score anomaly detections.

### Interface D: Phase 4 → FastAPI REST Layer
FastAPI imports inference services and anomaly detectors to expose:
- `/api/v1/forecast/latest`
- `/api/v1/forecast/{horizon}`
- `/api/v1/anomalies`
- `/api/v1/models`
- `/api/v1/model-performance`

---

## 3. How to Run & Verify

### Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run All Tests
```bash
pytest
```

### Run Model Training
```bash
python -m phase4.training.train_forecast
```

### Start API Server
```bash
uvicorn PHASE_3.API.main:app --host 0.0.0.0 --port 8000
```
