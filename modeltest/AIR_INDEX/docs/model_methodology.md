# AIR-INDEX — Machine Learning Model Methodology & Model Card

## 1. Model Card

### Model Identification
- **Model Family:** AIR-INDEX Time Series Forecaster
- **Version Convention:** `AIR_FORECAST_V1_<YYYYMMDD_HHMMSS>`
- **Methodology Version:** `AIR_INDEX_V1`
- **Feature Version:** `FEAT_V1_MONTHLY`
- **Primary Task:** Next-Period Monthly Headline AIR-INDEX Forecasting

---

## 2. Intended Use & Boundaries

- **Intended Purpose:** Provide macroeconomic trend forecasting of domestic airfare inflation for policy analysis and Consumer Price Index (CPI) augmentation studies.
- **Out-of-Scope Uses:**
  - Predicting exact ticket prices for individual flights or passenger bookings.
  - Making real-time algorithmic trading or inventory pricing decisions.
  - Official government CPI publication without authoritative regulatory approval.

---

## 3. Data & Feature Methodology

### Granularity Alignment
- In alignment with Section 12, the time series operates at **monthly granularity**.
- Historical series are constructed by Phase 3 from canonical observations.

### Feature Specification
- **Lags:** `lag_1`, `lag_2`, `lag_3` (months $t-1, t-2, t-3$)
- **Rolling Stats:** `rolling_mean_3`, `rolling_std_3`
- **Temporal Indicators:** `month`, `quarter`, `year`
- **Momentum:** Month-over-month change and percentage change
- **Quality Features:** `sample_count`, `route_coverage`, `quality_score`

### Data Leakage Guard
- Chronological train/validation/test split ($70\% / 15\% / 15\%$).
- Feature engineering uses `shift(1)` on target values so that information at period $t$ never accesses $t+1$.
- Scalers and imputation statistics are fitted strictly on the training set.

---

## 4. Evaluation Protocol

All models are evaluated on the exact same held-out test partition using standard metrics:
- **Mean Absolute Error (MAE):** $\text{MAE} = \frac{1}{n}\sum |y_i - \hat{y}_i|$
- **Root Mean Squared Error (RMSE):** $\text{RMSE} = \sqrt{\frac{1}{n}\sum (y_i - \hat{y}_i)^2}$
- **Symmetric MAPE (sMAPE):** $\text{sMAPE} = \frac{100\%}{n}\sum \frac{|y_i - \hat{y}_i|}{(|y_i| + |\hat{y}_i|)/2}$

### Candidate Comparison Discipline
Baselines (Naive Previous-Value, 3-Month Moving Average) are fitted first. Candidate ML regressors (Linear Regression, Random Forest, Gradient Boosting) must demonstrate lower validation error than baselines to be selected.

---

## 5. Development Data Limitation Disclosure

- **Current Available History:** 2 monthly periods (`2026-08`, `2026-09`) in development observations.
- **Consequence:** Models fitted on this 2-period development dataset serve as **verified structural test artifacts** to validate the integrity of the pipeline, feature calculation, artifact persistence, and API inference without runtime errors or leakage.
- **Production Requirement:** Meaningful statistical machine learning models require at least 12–24 months of continuous historical index data.
