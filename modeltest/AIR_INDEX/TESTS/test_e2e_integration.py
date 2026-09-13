"""End-to-End Integration Test for AIR-INDEX.

Exercises the full pipeline:
Phase 2 fixture/canonical observations
  -> Phase 3 statistical index engine (representative fare, route, booking window, headline index)
  -> Historical time series
  -> Phase 4 feature pipeline (temporal, lag, rolling, quality)
  -> Chronological split and leakage verification
  -> Baseline and ML model training & evaluation
  -> Anomaly detection (Z-score, IQR)
  -> FastAPI REST API endpoints
  -> JSON verification and data mode / provenance integrity.

This test uses DEVELOPMENT / FIXTURE data clearly labeled as such.
"""
from __future__ import annotations

import os
import sys
import json
import pytest
import pandas as pd
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from PIPELINE.validation import validate_observation
from PHASE_3.INDEX_ENGINE.pipeline import build_index
from phase4.features.feature_pipeline import (
    load_index_series,
    build_feature_dataset,
    get_feature_columns,
    get_target_column,
)
from phase4.features.splitter import (
    chronological_split,
    verify_no_leakage,
    verify_feature_no_future_leakage,
)
from phase4.forecasting.baselines import NaiveBaseline, MovingAverageBaseline
from phase4.forecasting.ml_models import fit_all_candidates, ForecastModel
from phase4.evaluation.metrics import evaluate_model, compare_models, mae, rmse, smape
from phase4.anomaly_detection.detector import (
    RollingZScoreDetector,
    IQRDetector,
    detect_all_anomalies,
)
from PHASE_3.API.main import app


class TestE2EIntegration:
    """Complete end-to-end integration test exercising all phases."""

    def test_full_pipeline_e2e(self):
        # ─────────────────────────────────────────────────────────────────
        # Step 1: Phase 2 Canonical Observations
        # ─────────────────────────────────────────────────────────────────
        fixture_path = ROOT / "DATA" / "processed" / "fixture_validated.csv"
        assert fixture_path.exists(), f"Phase 2 fixture missing at {fixture_path}"

        df_raw = pd.read_csv(fixture_path)
        assert len(df_raw) > 0, "Phase 2 fixture has 0 rows"

        # Verify key canonical observation fields
        required_fields = [
            "observation_id", "source", "airline", "origin", "destination",
            "search_date", "travel_date", "lead_time", "fare_class",
            "base_fare", "taxes", "fees", "total_fare", "currency",
            "timestamp", "data_mode",
        ]
        for field in required_fields:
            assert field in df_raw.columns, f"Canonical field {field} missing from observations"

        # Check data mode is valid development/fixture mode
        sample_mode = df_raw["data_mode"].iloc[0]
        assert sample_mode in {"FIXTURE", "PHASE2_FIXTURE", "DEVELOPMENT_SYNTHETIC", "DEVELOPMENT"}, (
            f"Unexpected data_mode {sample_mode}"
        )

        # ─────────────────────────────────────────────────────────────────
        # Step 2: Phase 3 Statistical Index Calculation
        # ─────────────────────────────────────────────────────────────────
        dev_obs_path = ROOT / "PHASE_3" / "DATA" / "development_observations.csv"
        assert dev_obs_path.exists(), f"Phase 3 dev data missing at {dev_obs_path}"
        obs_df = pd.read_csv(dev_obs_path)
        for c in ["travel_date", "search_date", "timestamp"]:
            if c in obs_df.columns:
                obs_df[c] = pd.to_datetime(obs_df[c])

        phase3_result = build_index(obs_df.to_dict("records"), ROOT / "PHASE_3")
        assert "headline_indices" in phase3_result
        assert "route_indices" in phase3_result
        assert "overall_indices" in phase3_result
        assert "airline_indices" in phase3_result
        assert "methodology" in phase3_result

        headline = phase3_result["headline_indices"]
        routes = phase3_result["route_indices"]
        windows = phase3_result["overall_indices"]

        assert len(headline) > 0, "Headline index calculation produced no results"
        assert len(routes) > 0, "Route index calculation produced no results"
        assert len(windows) > 0, "Booking-window index calculation produced no results"

        # Validate Base-100 and non-negative values
        for h in headline:
            assert h["index_value"] > 0, "Headline index must be positive"
            assert h["booking_window"] == "ALL"
            assert h["quality_status"] in {"VALID", "HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"}
            assert h["data_mode"] == "DEVELOPMENT_SYNTHETIC"

        # Check route index routes match standard prototype routes
        observed_routes = {r["route"] for r in routes}
        assert "DEL-BOM" in observed_routes
        assert "DEL-BLR" in observed_routes

        # ─────────────────────────────────────────────────────────────────
        # Step 3: Phase 4 Feature Pipeline & Leakage Guard
        # ─────────────────────────────────────────────────────────────────
        # Create a synthetic series of 8 monthly periods for robust feature testing
        series_indices = []
        for i in range(8):
            m = (i % 12) + 1
            y = 2026 + (i // 12)
            series_indices.append({
                "period": f"{y}-{m:02d}",
                "booking_window": "ALL",
                "index_value": 100.0 + i * 1.8,
                "sample_count": 30 + i * 2,
                "route_coverage": 1.0,
                "quality_score": 0.92,
                "quality_status": "HIGH",
                "data_mode": "DEVELOPMENT_SYNTHETIC",
                "methodology_version": "AIR_INDEX_V1",
            })

        feat_df = build_feature_dataset(series_indices)
        feature_cols = get_feature_columns(feat_df)
        target_col = get_target_column()

        assert target_col in feat_df.columns
        for fc in ["month", "quarter", "lag_1", "lag_2", "rolling_mean_3", "mom_change"]:
            assert fc in feat_df.columns

        # Verify chronological split
        train_df, val_df, test_df = chronological_split(feat_df, train_frac=0.5, val_frac=0.25, test_frac=0.25)
        verify_no_leakage(train_df, val_df, test_df)

        # ─────────────────────────────────────────────────────────────────
        # Step 4: Baselines & ML Forecasting
        # ─────────────────────────────────────────────────────────────────
        values = np.array([idx["index_value"] for idx in series_indices])

        naive = NaiveBaseline()
        naive.fit(values[:5])
        preds_naive = naive.predict(3)
        assert len(preds_naive) == 3
        assert preds_naive[0] == values[4]

        ma = MovingAverageBaseline(window=3)
        ma.fit(values[:5])
        preds_ma = ma.predict(3)
        assert len(preds_ma) == 3
        expected_ma = np.mean(values[2:5])
        assert abs(preds_ma[0] - expected_ma) < 1e-6

        # Evaluation metrics test
        actuals = values[5:8]
        mae_val = mae(actuals, preds_naive)
        rmse_val = rmse(actuals, preds_naive)
        smape_val = smape(actuals, preds_naive)
        assert mae_val >= 0
        assert rmse_val >= 0
        assert 0 <= smape_val <= 200

        # ML models train and predict
        X_train = train_df[feature_cols].fillna(0).values
        y_train = train_df[target_col].values
        ml_results = fit_all_candidates(X_train, y_train, feature_names=feature_cols)
        assert len(ml_results) >= 1
        for name, m in ml_results.items():
            p = m.predict(X_train[:2])
            assert len(p) == 2

        # ─────────────────────────────────────────────────────────────────
        # Step 5: Anomaly Detection
        # ─────────────────────────────────────────────────────────────────
        anomalies = detect_all_anomalies(headline, routes)
        assert isinstance(anomalies, list)
        for anom in anomalies:
            assert "anomaly_id" in anom
            assert "observed_value" in anom
            assert "expected_value" in anom
            assert "severity" in anom
            assert anom["severity"] in {"LOW", "MEDIUM", "HIGH"}
            assert "method" in anom

        # Test obvious anomaly detection
        detector = RollingZScoreDetector(window=3, threshold=2.0)
        test_df_anom = pd.DataFrame({
            "period": pd.date_range("2026-01", periods=10, freq="MS"),
            "index_value": [100.0, 101.0, 100.0, 101.0, 100.0, 101.0, 100.0, 200.0, 100.0, 101.0],
        })
        anom_flags = detector.detect(test_df_anom)
        assert len(anom_flags) > 0, "Extreme outlier must be detected"
        assert any(a["observed_value"] == 200.0 for a in anom_flags)

        # ─────────────────────────────────────────────────────────────────
        # Step 6: FastAPI REST API Verification
        # ─────────────────────────────────────────────────────────────────
        client = TestClient(app)

        # Health
        res = client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.json()["status"] == "success"

        # Headline latest
        res = client.get("/api/v1/index/latest")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["booking_window"] == "ALL"
        assert data["data_mode"] == "DEVELOPMENT_SYNTHETIC"

        # Route indices
        res = client.get("/api/v1/index/routes")
        assert res.status_code == 200
        assert len(res.json()["data"]) > 0

        # Forecast latest
        res = client.get("/api/v1/forecast/latest")
        assert res.status_code == 200
        f_data = res.json()["data"]
        assert "forecast" in f_data or "predicted_value" in f_data or "forecasts" in f_data or "message" in f_data

        # Forecast horizon endpoint
        res = client.get("/api/v1/forecast/1")
        assert res.status_code == 200
        f_horizon = res.json()["data"]
        assert "forecasts" in f_horizon
        assert f_horizon["forecasts"][0]["horizon_month"] == 1

        # Anomalies
        res = client.get("/api/v1/anomalies")
        assert res.status_code == 200
        assert "anomalies" in res.json()["data"]

        # Models
        res = client.get("/api/v1/models")
        assert res.status_code == 200
        assert "models" in res.json()["data"]
