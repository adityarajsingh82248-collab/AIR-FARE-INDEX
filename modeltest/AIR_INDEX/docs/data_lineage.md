# AIR-INDEX — End-to-End Data Lineage

## 1. Lineage Chain

Every metric, index value, forecast, and anomaly in the AIR-INDEX system can be traced back to its raw collection origin:

```
[ Collection Event / Raw Response (IndiGo NDC / API / Scrape) ]
                             │
                             ▼
[ Normalization & Canonical Schema Enforcement ]
                             │
                             ▼
[ Validation, Consistency Check & Deduplication ]
                             │
                             ▼
[ PostgreSQL: Canonical Observations Table (`usable_for_index=true`) ]
                             │
                             ▼
[ Phase 3: Representative Fare Calculation (Median by Route/Window/Period) ]
                             │
                             ▼
[ Phase 3: Base-100 Route & Booking-Window Indices ]
                             │
                             ▼
[ Phase 3: Weighted Aggregate Headline AIR-INDEX ]
                             │
                             ▼
[ Phase 4: Chronological Feature Matrix (Temporal, Lag, Rolling, Quality) ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
[ Phase 4: ML Forecast ]           [ Phase 4: Anomaly Detection ]
(Point Forecast + Intervals)       (Z-Score / IQR Flag + Severity)
            │                                 │
            ▼                                 ▼
[ PostgreSQL: `forecasts` Table ]  [ PostgreSQL: `anomalies` Table ]
            │                                 │
            └────────────────┬────────────────┘
                             ▼
              [ FastAPI REST Service Layer ]
                             │
                             ▼
                 [ Dashboard / End Consumer ]
```

---

## 2. Lineage Audit Fields

To satisfy rigorous auditability standards, every tier maintains provenance metadata:

| Tier | Lineage / Provenance Metadata Fields |
|---|---|
| **Raw Ingestion** | `source`, `collection_run_id`, `timestamp`, `is_mock`, `data_mode`, `environment` |
| **Canonical Observation** | `observation_id`, `source`, `airline`, `origin`, `destination`, `search_date`, `travel_date`, `lead_time`, `fare_consistency_flag`, `validation_status`, `usable_for_index` |
| **Statistical Index** | `period`, `route`, `booking_window`, `representative_price`, `base_price`, `index_value`, `sample_count`, `quality_score`, `quality_status`, `methodology_version`, `data_mode` |
| **ML Feature Matrix** | `period`, `index_value`, `lag_1..3`, `rolling_mean_3`, `rolling_std_3`, `mom_change`, `sample_count`, `route_coverage`, `data_mode` |
| **ML Forecast** | `forecast_id`, `model_version`, `feature_version`, `methodology_version`, `target`, `horizon`, `forecast_period`, `predicted_value`, `lower_bound`, `upper_bound`, `generated_at` |
| **Anomaly Record** | `anomaly_id`, `period`, `route`, `booking_window`, `observed_value`, `expected_value`, `deviation`, `anomaly_score`, `severity`, `method`, `model_version`, `detected_at` |

---

## 3. Data Integrity & Verification

1. **Auditability:** Any index spike can be investigated by drilling down from the headline index to the route index, to the representative median fare, to the individual validated flight observation IDs, and finally to the raw collector request/response payload.
2. **Immutability of Base Period:** The base period reference fares are versioned under `methodology_version` to prevent unrecorded baseline shifts.
3. **No Phantom Observations:** Uncollected or missing routes/windows remain explicitly flagged (`MISSING_BASE`, `INSUFFICIENT_DATA`, `route_coverage < 1.0`) and are never imputed as zero fare.
