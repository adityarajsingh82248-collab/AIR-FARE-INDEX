# AIR-INDEX — Master Integrated Platform (Phases 1–4)

**SIH Problem Statement:** SIH26056  
**Title:** Development of a Real-time Airfare Price Index for India through Automated Web Scraping of Airline and Online Travel Aggregator Portals for Augmentation of the Consumer Price Index (CPI)  
**Team:** Team Udaan  

---

## 1. Project Overview

AIR-INDEX is an integrated airfare intelligence and price index engine designed to capture, normalize, validate, index, forecast, and analyze domestic airfare trends across India.

The project integrates four engineering phases into a unified repository:
- **Phase 1 — Data Foundation:** Requirements, canonical schema, data dictionary, route & window definitions, validation rules.
- **Phase 2 — Automated Collection & Processing:** Authorized collectors, IndiGo NDC adapter, raw capture, canonical normalization, validation, deduplication, and PostgreSQL ingestion.
- **Phase 3 — Statistical Engine & API:** Representative fares (median), Base-100 indexing, prototype route weighting, headline index calculation, quality scoring, and FastAPI REST endpoints.
- **Phase 4 — Machine Learning & Analytics:** Feature generation (monthly granularity), chronological splitting, baseline & ML forecasting, rolling Z-score & IQR anomaly detection, model registry, and extended API endpoints.

---

## 2. Architecture & Data Flow

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

## 3. Directory Layout

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
├── docs/               # Unified system documentation
│   ├── api.md
│   ├── architecture.md
│   ├── data_lineage.md
│   ├── integration.md
│   ├── model_methodology.md
│   └── phase4_ml.md
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
├── shared/             # Shared configuration loader
├── pytest.ini          # Test runner configuration
├── requirements.txt    # Project dependencies
└── README.md           # Master documentation
```

---

## 4. Key Specifications

### Prototype Routes (6 Key Domestic Corridors)
`DEL-BOM`, `DEL-BLR`, `BOM-BLR`, `DEL-CCU`, `BLR-HYD`, `MAA-DEL`

### Booking Windows (5 Lead Times)
`T+1`, `T+7`, `T+15`, `T+30`, `T+45`

### Methodology Principles
1. **Representative Fare:** Median of valid INR `total_fare` observations per route and lead time.
2. **Base-100 Indexing:** $I_t = \frac{P_t}{P_0} \times 100$.
3. **Headline Index:** Route-weighted aggregation normalized across all booking windows.
4. **Data Mode Discipline:** Synthetic and fixture datasets are strictly marked `DEVELOPMENT_SYNTHETIC` or `PHASE2_FIXTURE` and never disguised as live data.
5. **Leakage-Free ML:** Chronological train/validation/test splitting ($70/15/15$), rolling statistics with `shift(1)`, and baseline-first model selection.

---

## 5. Quickstart & Commands

### 1. Environment Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Test Suite
```bash
pytest
```

### 3. Run Phase 4 ML Training
```bash
python -m phase4.training.train_forecast
```

### 4. Start FastAPI Server
```bash
uvicorn PHASE_3.API.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 6. Real-Time Operation Claim

Phase 1, Phase 2, Phase 3 and Phase 4 engineering pipelines are implemented and validated using development, historical, fixture, or authorized data according to the available data mode. Real-time production AIR-INDEX operation depends on an authorized live airfare data source.
