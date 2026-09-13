# AIR-INDEX Phase 4 — Machine Learning, Forecasting & Anomaly Detection

## 1. Executive Summary & Section 12 Granularity Decision

Phase 4 introduces machine learning forecasting and anomaly detection on top of the validated AIR-INDEX statistical engine (Phases 1–3).

### Granularity Decision (Section 12)
- **Phase 3 Output Granularity:** Monthly (`YYYY-MM`). Phase 3 calculates representative fares and Base-100 indices by month.
- **Phase 4 Alignment:** Phase 4 features and forecast horizons operate at **monthly granularity** (`next_period_monthly`).
- **Feature Definitions:**
  - `lag_1`, `lag_2`, `lag_3` represent prior months ($t-1, t-2, t-3$).
  - `rolling_mean_3`, `rolling_std_3` represent 3-month rolling statistics.
  - Daily lag features (`lag_7`, `lag_14`, `lag_30`) and `day_of_week` are excluded because the underlying index is monthly.
- **Data Limitation Disclosure:** The development dataset contains 2 monthly periods (`2026-08`, `2026-09`). Models trained on this development dataset serve as **structural integration artifacts** to validate the pipeline without data leakage. Production forecasting requires a continuous multi-period history.

---

## 2. Target Variable & Horizon

- **Primary Target:** Future Headline AIR-INDEX value ($t+1$ month).
- **Target Column:** `index_value`
- **Horizon:** Configurable via `phase4_config.yaml` (`next_period_monthly`, with multi-step support up to 12 months in the API).

---

## 3. Feature Generation Pipeline

Module: [`phase4.features.feature_pipeline`](file:///Users/jatinsharma/Desktop/hell/AIR_INDEX/phase4/features/feature_pipeline.py)

1. **Temporal Features:**
   - `month` (1–12)
   - `quarter` (1–4)
   - `year`
2. **Lag Features:**
   - `lag_1`: Index value at $t-1$
   - `lag_2`: Index value at $t-2$
   - `lag_3`: Index value at $t-3$
3. **Rolling Statistics:**
   - `rolling_mean_3`: 3-month rolling average (computed strictly on past values via `shift(1)`)
   - `rolling_std_3`: 3-month rolling standard deviation
4. **Momentum Features:**
   - `mom_change`: Month-over-month absolute change ($I_t - I_{t-1}$)
   - `mom_pct_change`: Month-over-month percentage change
5. **Quality Indicators:**
   - `sample_count`: Number of validated observations in the period
   - `route_coverage`: Proportion of required routes covered (0.0–1.0)
   - `quality_score`: Overall composite data quality score
6. **Cross-Sectional Route Features (Optional):**
   - Route index values for key prototype routes (`route_idx_DEL-BOM`, etc.)

---

## 4. Data Leakage Prevention

Module: [`phase4.features.splitter`](file:///Users/jatinsharma/Desktop/hell/AIR_INDEX/phase4/features/splitter.py)

- **Chronological Splitting:**
  - Training: Earliest 70%
  - Validation: Next 15%
  - Test: Latest 15%
  - No random shuffling permitted.
- **Leakage Guards:**
  - Strict ordering check: $\max(\text{train\_dates}) < \min(\text{val\_dates}) < \min(\text{test\_dates})$.
  - Preprocessing transformations (scalers, imputers) are fitted exclusively on the training partition.
  - Rolling windows use `shift(1)` to ensure current and future values never contaminate past statistics.

---

## 5. Forecasting Models & Baselines

Module: [`phase4.forecasting.baselines`](file:///Users/jatinsharma/Desktop/hell/AIR_INDEX/phase4/forecasting/baselines.py) and [`phase4.forecasting.ml_models`](file:///Users/jatinsharma/Desktop/hell/AIR_INDEX/phase4/forecasting/ml_models.py)

### Baselines (Mandatory Pre-ML)
1. **Naive Previous-Value:** $\hat{y}_{t+h} = y_t$
2. **Moving Average:** $\hat{y}_{t+h} = \frac{1}{k}\sum_{i=0}^{k-1} y_{t-i}$
3. **ARIMA/SARIMA:** Skipped with explicit reason when period count $N < 10$.

### ML Candidates
1. **Linear Regression:** Standard OLS with L2 regularization support.
2. **Random Forest Regressor:** Ensemble of decision trees ($n=100$, random_state=42).
3. **Gradient Boosting Regressor:** Boosted trees ($n=100$, learning_rate=0.1, max_depth=3).

### Model Selection Rule
If a baseline outperforms or matches ML candidates on validation MAE/RMSE, the baseline is selected. Complex models are never forced.

---

## 6. Evaluation Metrics

Module: [`phase4.evaluation.metrics`](file:///Users/jatinsharma/Desktop/hell/AIR_INDEX/phase4/evaluation/metrics.py)

- **MAE (Mean Absolute Error):** $\frac{1}{n}\sum |y_i - \hat{y}_i|$
- **RMSE (Root Mean Squared Error):** $\sqrt{\frac{1}{n}\sum (y_i - \hat{y}_i)^2}$
- **sMAPE (Symmetric Mean Absolute Percentage Error):** $\frac{100\%}{n}\sum \frac{|y_i - \hat{y}_i|}{(|y_i| + |\hat{y}_i|)/2}$

---

## 7. Anomaly Detection

Module: [`phase4.anomaly_detection.detector`](file:///Users/jatinsharma/Desktop/hell/AIR_INDEX/phase4/anomaly_detection/detector.py)

1. **Rolling Z-Score Detector:**
   - Baseline statistical detector.
   - Calculates $Z = \frac{y_t - \mu_{t-1}}{\sigma_{t-1}}$ using a 3-month rolling window on past data.
   - Flags $|Z| > 2.0$ as anomalous.
2. **IQR Detector:**
   - Interquartile range detector for robust non-parametric anomaly detection.
   - Flags values outside $[Q_1 - 1.5\text{IQR}, Q_3 + 1.5\text{IQR}]$.
3. **Severity Classification:**
   - `LOW`: $2.0 < |Z| \le 2.5$
   - `MEDIUM`: $2.5 < |Z| \le 3.5$
   - `HIGH`: $|Z| > 3.5$

---

## 8. Database Persistence & Model Registry

- **Migration:** [`phase4/database/phase4_migration.sql`](file:///Users/jatinsharma/Desktop/hell/AIR_INDEX/phase4/database/phase4_migration.sql)
- **Tables:**
  - `forecasts`: stores point predictions, intervals, target, horizon, model version.
  - `anomalies`: stores detected deviations, observed vs expected, z-scores, severity.
  - `model_registry`: stores model type, artifact paths, training date, feature version, performance metrics.
