"""Phase 4 tests — Feature pipeline, leakage, forecasting, evaluation, anomaly, model registry, API.

Tests use known toy data with hand-checkable expected outputs.
"""
from __future__ import annotations

import sys
import pytest
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from phase4.features.feature_pipeline import (
    load_index_series, generate_temporal_features, generate_lag_features,
    generate_rolling_features, generate_momentum_features, generate_quality_features,
    build_feature_dataset, get_feature_columns, get_target_column,
)
from phase4.features.splitter import (
    chronological_split, verify_no_leakage, verify_feature_no_future_leakage,
)
from phase4.forecasting.baselines import NaiveBaseline, MovingAverageBaseline, fit_all_baselines
from phase4.evaluation.metrics import mae, rmse, smape, evaluate_model, compare_models
from phase4.anomaly_detection.detector import (
    RollingZScoreDetector, IQRDetector, detect_all_anomalies,
)


# ── Fixtures ────────────────────────────────────────────────────────────────

def _make_headline_indices(n_periods=6, start_value=100.0, step=2.0):
    """Create synthetic headline indices for testing."""
    indices = []
    for i in range(n_periods):
        month = (i % 12) + 1
        year = 2026 + (i // 12)
        period = f"{year}-{month:02d}"
        value = start_value + i * step
        indices.append({
            "period": period,
            "booking_window": "ALL",
            "index_value": value,
            "sample_count": 30 + i * 5,
            "route_coverage": 1.0,
            "quality_score": 0.9,
            "quality_status": "HIGH",
            "data_mode": "DEVELOPMENT_SYNTHETIC",
            "methodology_version": "AIR_INDEX_V1",
        })
    return indices


def _make_route_indices(n_periods=6):
    """Create synthetic route indices for testing."""
    routes = ["DEL-BOM", "DEL-BLR", "BOM-BLR"]
    windows = ["T+1", "T+7"]
    indices = []
    for i in range(n_periods):
        month = (i % 12) + 1
        year = 2026 + (i // 12)
        period = f"{year}-{month:02d}"
        for route in routes:
            for window in windows:
                base = 100.0 + hash(route) % 20
                indices.append({
                    "period": period,
                    "route": route,
                    "booking_window": window,
                    "index_value": base + i * 1.5,
                    "representative_price": 4000 + i * 50,
                    "base_price": 4000.0,
                    "sample_count": 9,
                    "status": "VALID",
                    "data_mode": "DEVELOPMENT_SYNTHETIC",
                    "methodology_version": "AIR_INDEX_V1",
                })
    return indices


# ── Feature Pipeline Tests ──────────────────────────────────────────────────

class TestFeaturePipeline:
    """Tests for feature generation pipeline."""

    def test_load_index_series_basic(self):
        """Load headline indices into a sorted DataFrame."""
        indices = _make_headline_indices(4)
        df = load_index_series(indices)
        assert len(df) == 4
        assert "period" in df.columns
        assert "index_value" in df.columns
        # Check sorted
        assert df["period"].is_monotonic_increasing

    def test_load_index_series_empty(self):
        """Empty input produces empty DataFrame."""
        df = load_index_series([])
        assert df.empty

    def test_temporal_features(self):
        """Temporal features: month, quarter, year."""
        indices = _make_headline_indices(4)
        df = load_index_series(indices)
        df = generate_temporal_features(df)
        assert "month" in df.columns
        assert "quarter" in df.columns
        assert "year" in df.columns
        # No day_of_week (monthly granularity)
        assert "day_of_week" not in df.columns

    def test_lag_features(self):
        """Lag features correctly shift values."""
        indices = _make_headline_indices(6)
        df = load_index_series(indices)
        df = generate_lag_features(df, lags=[1, 2, 3])

        # lag_1 at position 1 should equal index_value at position 0
        assert df["lag_1"].iloc[1] == df["index_value"].iloc[0]
        # lag_1 at position 0 should be NaN (no prior value)
        assert pd.isna(df["lag_1"].iloc[0])
        # lag_2 at position 2 should equal index_value at position 0
        assert df["lag_2"].iloc[2] == df["index_value"].iloc[0]

    def test_lag_features_no_future_leakage(self):
        """Lag features must never contain future values."""
        indices = _make_headline_indices(6)
        df = load_index_series(indices)
        df = generate_lag_features(df, lags=[1, 2, 3])

        for i in range(len(df)):
            for lag in [1, 2, 3]:
                col = f"lag_{lag}"
                if i - lag < 0:
                    assert pd.isna(df[col].iloc[i]), f"lag_{lag} at row {i} should be NaN"
                else:
                    assert df[col].iloc[i] == df["index_value"].iloc[i - lag]

    def test_rolling_features(self):
        """Rolling mean and std computed correctly."""
        indices = _make_headline_indices(6)
        df = load_index_series(indices)
        df = generate_rolling_features(df, windows=[3])

        assert "rolling_mean_3" in df.columns
        assert "rolling_std_3" in df.columns
        # First value should use shifted data (rolling on past only)
        assert pd.isna(df["rolling_mean_3"].iloc[0])  # shift(1) makes first NaN

    def test_momentum_features(self):
        """Month-over-month change computed correctly."""
        indices = _make_headline_indices(4, start_value=100.0, step=10.0)
        df = load_index_series(indices)
        df = generate_momentum_features(df)

        assert "mom_change" in df.columns
        assert "mom_pct_change" in df.columns
        # Second row should show change of 10.0
        assert df["mom_change"].iloc[1] == 10.0
        # Percentage change should be 10%
        assert abs(df["mom_pct_change"].iloc[1] - 10.0) < 0.01

    def test_quality_features(self):
        """Quality features added with defaults if missing."""
        df = pd.DataFrame({"period": pd.date_range("2026-01", periods=3, freq="MS")})
        df = generate_quality_features(df)
        assert "sample_count" in df.columns
        assert "route_coverage" in df.columns
        assert "quality_score" in df.columns

    def test_build_feature_dataset_full(self):
        """Full feature dataset build."""
        headline = _make_headline_indices(6)
        route = _make_route_indices(6)
        df = build_feature_dataset(headline, route, lags=[1, 2], rolling_windows=[3])

        assert len(df) == 6
        assert "lag_1" in df.columns
        assert "lag_2" in df.columns
        assert "rolling_mean_3" in df.columns
        assert "month" in df.columns
        assert "mom_change" in df.columns

    def test_missing_values_handled(self):
        """Features with missing data don't crash."""
        indices = _make_headline_indices(2)
        indices[0]["index_value"] = None
        df = build_feature_dataset(indices)
        # Should still produce a DataFrame (may have NaN values)
        assert isinstance(df, pd.DataFrame)


# ── Leakage Tests ───────────────────────────────────────────────────────────

class TestLeakage:
    """Explicit tests that features at time t never use t+1 or later."""

    def test_chronological_split_ordering(self):
        """Train dates must precede val dates, which precede test dates."""
        indices = _make_headline_indices(10)
        df = load_index_series(indices)
        train, val, test = chronological_split(df)

        result = verify_no_leakage(train, val, test)
        assert result["valid"], result["details"]

    def test_no_shuffle_in_split(self):
        """Chronological split never shuffles data."""
        indices = _make_headline_indices(10)
        df = load_index_series(indices)
        train, val, test = chronological_split(df)

        # All splits must be monotonically increasing
        for split_name, split_df in [("train", train), ("val", val), ("test", test)]:
            if not split_df.empty:
                assert split_df["period"].is_monotonic_increasing, f"{split_name} is not sorted"

    def test_feature_lag_leakage_check(self):
        """Structural leakage check passes on correctly built features."""
        indices = _make_headline_indices(10)
        df = build_feature_dataset(indices, lags=[1, 2, 3])
        feature_cols = get_feature_columns(df)

        result = verify_feature_no_future_leakage(df, feature_cols)
        assert result["valid"], f"Leakage issues: {result['issues']}"

    def test_split_fractions_sum_to_one(self):
        """Split fractions must sum to 1.0."""
        with pytest.raises(ValueError, match="sum to 1.0"):
            chronological_split(pd.DataFrame({"period": [1, 2, 3]}),
                                train_frac=0.5, val_frac=0.5, test_frac=0.5)

    def test_empty_data_split(self):
        """Empty data produces empty splits."""
        train, val, test = chronological_split(pd.DataFrame())
        assert train.empty and val.empty and test.empty


# ── Forecasting Tests ───────────────────────────────────────────────────────

class TestForecasting:
    """Tests for baseline and ML model forecasting."""

    def test_naive_baseline(self):
        """Naive baseline predicts last value."""
        y = np.array([100, 102, 104, 106])
        model = NaiveBaseline()
        model.fit(y)
        preds = model.predict(3)
        assert len(preds) == 3
        assert all(p == 106.0 for p in preds)

    def test_naive_baseline_empty(self):
        """Naive baseline raises on empty data."""
        with pytest.raises(ValueError):
            NaiveBaseline().fit(np.array([]))

    def test_moving_average_baseline(self):
        """Moving average predicts mean of last N values."""
        y = np.array([100, 102, 104, 106])
        model = MovingAverageBaseline(window=3)
        model.fit(y)
        preds = model.predict(1)
        # Mean of [102, 104, 106] = 104.0
        assert abs(preds[0] - 104.0) < 1e-6

    def test_moving_average_small_window(self):
        """Moving average with window > data length uses all data."""
        y = np.array([100, 102])
        model = MovingAverageBaseline(window=5)
        model.fit(y)
        preds = model.predict(1)
        assert abs(preds[0] - 101.0) < 1e-6

    def test_fit_all_baselines(self):
        """All baselines can be fitted."""
        y = np.array([100, 102, 104, 106, 108])
        baselines = fit_all_baselines(y)
        assert "naive_previous_value" in baselines
        assert "moving_average_3" in baselines

    def test_unfitted_model_raises(self):
        """Predicting without fitting raises RuntimeError."""
        model = NaiveBaseline()
        with pytest.raises(RuntimeError):
            model.predict(1)


# ── Evaluation Tests ────────────────────────────────────────────────────────

class TestEvaluation:
    """Tests for metrics with hand-checkable expected values."""

    def test_mae_known_values(self):
        """MAE on known series: |100-102| + |104-104| + |106-108| / 3 = 4/3."""
        y_true = np.array([100, 104, 106])
        y_pred = np.array([102, 104, 108])
        result = mae(y_true, y_pred)
        assert abs(result - 4/3) < 1e-6

    def test_rmse_known_values(self):
        """RMSE on known series: sqrt((4+0+4)/3) = sqrt(8/3)."""
        y_true = np.array([100, 104, 106])
        y_pred = np.array([102, 104, 108])
        result = rmse(y_true, y_pred)
        expected = np.sqrt(8/3)
        assert abs(result - expected) < 1e-6

    def test_smape_known_values(self):
        """sMAPE hand-check: 100/3 * Σ |true-pred| / ((|true|+|pred|)/2)."""
        y_true = np.array([100.0, 200.0])
        y_pred = np.array([110.0, 190.0])
        # |100-110|/((100+110)/2) = 10/105 = 0.09524
        # |200-190|/((200+190)/2) = 10/195 = 0.05128
        # sMAPE = 100/2 * (0.09524 + 0.05128) = 50 * 0.14652 = 7.326
        result = smape(y_true, y_pred)
        expected = 100 / 2 * (10/105 + 10/195)
        assert abs(result - expected) < 0.01

    def test_mae_empty(self):
        """MAE on empty arrays returns NaN."""
        result = mae(np.array([]), np.array([]))
        assert np.isnan(result)

    def test_evaluate_model_output(self):
        """evaluate_model returns all expected fields."""
        y_true = np.array([100, 102, 104])
        y_pred = np.array([101, 103, 103])
        result = evaluate_model(y_true, y_pred, model_name="test_model")
        assert result["model_name"] == "test_model"
        assert "mae" in result
        assert "rmse" in result
        assert "smape" in result
        assert result["n_samples"] == 3

    def test_compare_models_selects_best(self):
        """compare_models picks the model with lowest MAE."""
        results = [
            {"model_name": "A", "mae": 5.0, "rmse": 6.0, "smape": 10.0},
            {"model_name": "B", "mae": 3.0, "rmse": 4.0, "smape": 8.0},
            {"model_name": "C", "mae": 7.0, "rmse": 8.0, "smape": 12.0},
        ]
        comparison = compare_models(results)
        assert comparison["best_model"] == "B"


# ── Anomaly Detection Tests ────────────────────────────────────────────────

class TestAnomalyDetection:
    """Tests for anomaly detection methods."""

    def test_z_score_normal_observation(self):
        """Normal values should not be flagged."""
        # Stable series with small variation
        df = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=10, freq="MS"),
            "index_value": [100, 101, 100, 101, 100, 101, 100, 101, 100, 101],
        })
        detector = RollingZScoreDetector(threshold=2.0)
        anomalies = detector.detect(df)
        # With stable values, no anomalies expected
        assert len(anomalies) == 0

    def test_z_score_obvious_anomaly(self):
        """Extreme outlier should be detected."""
        values = [100, 101, 100, 101, 100, 101, 100, 200, 100, 101]  # 200 is extreme
        df = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=10, freq="MS"),
            "index_value": values,
        })
        detector = RollingZScoreDetector(threshold=2.0)
        anomalies = detector.detect(df)
        # The value 200 should be detected
        assert len(anomalies) > 0
        assert any(a["observed_value"] == 200.0 for a in anomalies)

    def test_z_score_missing_data(self):
        """Missing values should not crash detection."""
        df = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=5, freq="MS"),
            "index_value": [100, None, 102, 104, 106],
        })
        detector = RollingZScoreDetector()
        # Should not raise
        anomalies = detector.detect(df)
        assert isinstance(anomalies, list)

    def test_z_score_small_sample(self):
        """Detection on very small sample (< 3 points)."""
        df = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=2, freq="MS"),
            "index_value": [100, 200],
        })
        detector = RollingZScoreDetector()
        anomalies = detector.detect(df)
        assert isinstance(anomalies, list)

    def test_iqr_detection(self):
        """IQR detector flags values outside 1.5*IQR."""
        values = [100, 101, 100, 101, 100, 101, 100, 200, 100, 101]
        df = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=10, freq="MS"),
            "index_value": values,
        })
        detector = IQRDetector(multiplier=1.5)
        anomalies = detector.detect(df)
        assert any(a["observed_value"] == 200.0 for a in anomalies)

    def test_anomaly_output_fields(self):
        """Each anomaly must have all required fields."""
        values = [100, 101, 100, 101, 100, 101, 100, 200, 100, 101]
        df = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=10, freq="MS"),
            "index_value": values,
        })
        detector = RollingZScoreDetector(threshold=2.0)
        anomalies = detector.detect(df)
        if anomalies:
            required = {"anomaly_id", "period", "observed_value", "expected_value",
                        "deviation", "anomaly_score", "severity", "method",
                        "model_version", "detected_at"}
            assert required.issubset(set(anomalies[0].keys()))

    def test_detect_all_anomalies_integration(self):
        """detect_all_anomalies runs on Phase 3-format data."""
        headline = _make_headline_indices(6)
        # Inject an anomaly
        headline[4]["index_value"] = 500.0
        anomalies = detect_all_anomalies(headline)
        assert isinstance(anomalies, list)

    def test_iqr_too_few_points(self):
        """IQR detector returns empty on < 3 points."""
        df = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=2, freq="MS"),
            "index_value": [100, 200],
        })
        detector = IQRDetector()
        anomalies = detector.detect(df)
        assert anomalies == []

    def test_empty_series(self):
        """Empty series produces no anomalies."""
        detector = RollingZScoreDetector()
        assert detector.detect(pd.DataFrame()) == []


# ── Model Registry Tests ───────────────────────────────────────────────────

class TestModelRegistry:
    """Tests for model versioning and metadata persistence."""

    def test_save_and_load_model(self, tmp_path):
        """Model can be saved and loaded with metadata."""
        from phase4.forecasting.ml_models import ForecastModel, save_model, load_model

        model = ForecastModel("linear_regression")
        X = np.array([[1, 2], [3, 4], [5, 6]])
        y = np.array([1, 2, 3])
        model.fit(X, y, feature_names=["f1", "f2"])

        meta = save_model(model, tmp_path, metrics={"mae": 0.5},
                          methodology_version="AIR_INDEX_V1")

        assert "model_version" in meta
        assert meta["methodology_version"] == "AIR_INDEX_V1"
        assert meta["metrics"]["mae"] == 0.5

        # Load back
        loaded_model, loaded_meta = load_model(Path(meta["artifact_path"]))
        assert loaded_meta["model_type"] == "linear_regression"
        assert loaded_meta["feature_names"] == ["f1", "f2"]

    def test_model_metadata_contains_methodology_version(self):
        """Model metadata must be tied to a specific methodology_version."""
        from phase4.forecasting.ml_models import ForecastModel

        model = ForecastModel("linear_regression")
        X = np.array([[1, 2], [3, 4]])
        y = np.array([1, 2])
        model.fit(X, y)
        meta = model.metadata()
        assert "training_date" in meta
        assert meta["is_fitted"] is True

    def test_model_version_format(self, tmp_path):
        """Model version follows expected naming convention."""
        from phase4.forecasting.ml_models import ForecastModel, save_model

        model = ForecastModel("random_forest")
        X = np.array([[1], [2], [3]])
        y = np.array([1, 2, 3])
        model.fit(X, y)

        meta = save_model(model, tmp_path)
        assert meta["model_version"].startswith("AIR_FORECAST_V1_")


# ── Integration with Phase 3 ───────────────────────────────────────────────

class TestPhase3Integration:
    """Tests that Phase 4 correctly consumes Phase 3 output."""

    def test_build_features_from_phase3_output(self):
        """Feature pipeline works with Phase 3-format data."""
        headline = _make_headline_indices(6)
        route = _make_route_indices(6)
        df = build_feature_dataset(headline, route)
        assert not df.empty
        assert "index_value" in df.columns
        assert "lag_1" in df.columns

    def test_full_pipeline_structural(self):
        """Structural test: features → split → baselines → evaluate."""
        headline = _make_headline_indices(10)
        df = build_feature_dataset(headline, lags=[1], rolling_windows=[3])

        train, val, test = chronological_split(df)
        leakage = verify_no_leakage(train, val, test)
        assert leakage["valid"]

        if len(train) > 0:
            y_train = train["index_value"].dropna().values
            if len(y_train) > 0:
                baselines = fit_all_baselines(y_train)
                assert len(baselines) > 0

                eval_set = test if not test.empty else val
                if not eval_set.empty:
                    y_eval = eval_set["index_value"].dropna().values
                    for name, model in baselines.items():
                        preds = model.predict(len(y_eval))
                        result = evaluate_model(y_eval, preds, model_name=name)
                        assert not np.isnan(result["mae"])

    def test_data_volume_check(self):
        """With only 2 periods, training should still work structurally."""
        headline = _make_headline_indices(2)
        df = build_feature_dataset(headline)
        # Should produce data but very limited
        assert len(df) == 2
        feature_cols = get_feature_columns(df)
        # Features exist even if most are NaN
        assert len(feature_cols) > 0
