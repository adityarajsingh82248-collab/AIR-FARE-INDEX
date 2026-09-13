"""Reproducible training entry point for AIR-INDEX Phase 4.

Usage: python -m phase4.training.train_forecast

Pipeline:
1. Load Phase 3 index data (from development observations or PostgreSQL)
2. Generate features
3. Split chronologically
4. Train baselines
5. Train ML candidates
6. Evaluate all
7. Select best model
8. Save artifact + metadata
9. Persist metrics

NEVER trains inside a GET endpoint. Training is a batch process.
"""
from __future__ import annotations

import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

# Add project root to path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from PHASE_3.INDEX_ENGINE.pipeline import build_index
from phase4.features.feature_pipeline import (
    build_feature_dataset, get_feature_columns, get_target_column,
)
from phase4.features.splitter import chronological_split, verify_no_leakage
from phase4.forecasting.baselines import fit_all_baselines
from phase4.forecasting.ml_models import fit_all_candidates, save_model, ForecastModel
from phase4.evaluation.metrics import evaluate_model, compare_models
from phase4.anomaly_detection.detector import detect_all_anomalies


def load_development_data() -> dict:
    """Load Phase 3 index results from development observations."""
    data_path = ROOT / "PHASE_3" / "DATA" / "development_observations.csv"
    if not data_path.exists():
        raise FileNotFoundError(f"Development observations not found: {data_path}")

    df = pd.read_csv(data_path)
    for c in ["travel_date", "search_date", "timestamp"]:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c])

    result = build_index(df.to_dict("records"), ROOT / "PHASE_3")
    return result


def run_training() -> dict:
    """Execute the full training pipeline.

    Returns:
        Dict with training results, metrics, and status.
    """
    report = {
        "timestamp": datetime.now().isoformat(),
        "status": "started",
        "data_mode": "DEVELOPMENT_SYNTHETIC",
        "granularity": "monthly",
        "forecast_horizon": "next_period_monthly",
    }

    # Step 1: Load index data
    print("[1/9] Loading Phase 3 index data...")
    try:
        index_result = load_development_data()
    except Exception as e:
        report["status"] = "failed"
        report["error"] = f"Failed to load data: {e}"
        return report

    headline = index_result.get("headline_indices", [])
    route_idx = index_result.get("route_indices", [])

    print(f"  Headline indices: {len(headline)} periods")
    print(f"  Route indices: {len(route_idx)} records")

    # Step 2: Generate features
    print("[2/9] Generating features...")
    features_df = build_feature_dataset(
        headline, route_idx, lags=[1, 2, 3], rolling_windows=[3]
    )

    if features_df.empty:
        report["status"] = "failed"
        report["error"] = "Feature dataset is empty"
        return report

    feature_cols = get_feature_columns(features_df)
    target_col = get_target_column()

    print(f"  Feature dataset: {len(features_df)} rows, {len(feature_cols)} features")
    report["feature_count"] = len(feature_cols)
    report["data_points"] = len(features_df)

    # Step 3: Data volume check
    print("[3/9] Checking data volume...")
    if len(features_df) < 3:
        report["data_volume_warning"] = (
            f"Only {len(features_df)} monthly periods available. "
            "This is insufficient for meaningful train/val/test split. "
            "Model artifact will be labeled as structural/integration test only, "
            "not a usable forecaster."
        )
        print(f"  WARNING: {report['data_volume_warning']}")

    # Step 4: Chronological split
    print("[4/9] Splitting data chronologically...")
    train_df, val_df, test_df = chronological_split(features_df)
    leakage_check = verify_no_leakage(train_df, val_df, test_df)
    report["leakage_check"] = leakage_check

    print(f"  Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    print(f"  Leakage check: {leakage_check['details']}")

    # Prepare arrays — drop rows with NaN target
    numeric_features = [c for c in feature_cols if c in features_df.select_dtypes(include=[np.number]).columns]

    all_results = []

    # Step 5: Train baselines
    print("[5/9] Training baselines...")
    train_target = train_df[target_col].dropna().values
    if len(train_target) > 0:
        baselines = fit_all_baselines(train_target)

        # Evaluate baselines on test set (or val if test is empty)
        eval_set = test_df if not test_df.empty else val_df
        if not eval_set.empty and target_col in eval_set.columns:
            y_eval = eval_set[target_col].dropna().values
            for name, model in baselines.items():
                preds = model.predict(len(y_eval))
                result = evaluate_model(y_eval, preds, model_name=name)
                all_results.append(result)
                print(f"  {name}: MAE={result['mae']:.4f}, RMSE={result['rmse']:.4f}")
    else:
        print("  WARNING: No training data available for baselines")

    # Step 6: Train ML candidates
    print("[6/9] Training ML candidates...")
    ml_results = {}
    best_ml_model = None

    if len(train_df) > 0 and len(numeric_features) > 0:
        X_train = train_df[numeric_features].fillna(0).values
        y_train = train_df[target_col].fillna(0).values

        train_period = {
            "start": str(train_df["period"].min())[:7] if "period" in train_df.columns else None,
            "end": str(train_df["period"].max())[:7] if "period" in train_df.columns else None,
        }

        try:
            candidates = fit_all_candidates(
                X_train, y_train,
                feature_names=numeric_features,
                train_period=train_period,
            )

            eval_set = test_df if not test_df.empty else val_df
            if not eval_set.empty:
                X_eval = eval_set[numeric_features].fillna(0).values
                y_eval = eval_set[target_col].dropna().values

                if len(X_eval) > 0 and len(y_eval) > 0:
                    for name, model in candidates.items():
                        preds = model.predict(X_eval[:len(y_eval)])
                        result = evaluate_model(y_eval, preds, model_name=name)
                        all_results.append(result)
                        ml_results[name] = result
                        print(f"  {name}: MAE={result['mae']:.4f}, RMSE={result['rmse']:.4f}")

                    # Find best ML model for saving
                    if candidates:
                        best_ml_name = min(ml_results, key=lambda k: ml_results[k].get("mae", float("inf")))
                        best_ml_model = candidates[best_ml_name]
        except Exception as e:
            print(f"  WARNING: ML training failed: {e}")
            report["ml_training_error"] = str(e)
    else:
        print("  WARNING: Insufficient data for ML models")

    # Step 7: Compare and select
    print("[7/9] Comparing models...")
    comparison = compare_models(all_results)
    report["model_comparison"] = comparison
    print(f"  {comparison['recommendation']}")

    # Step 8: Save best model artifact
    print("[8/9] Saving model artifact...")
    models_dir = ROOT / "phase4" / "models"

    if best_ml_model is not None:
        best_metrics = ml_results.get(best_ml_model.name, {})
        meta = save_model(
            best_ml_model, models_dir, metrics=best_metrics,
            methodology_version=index_result.get("methodology", {}).get("methodology_version", "AIR_INDEX_V1"),
        )
        report["saved_model"] = meta
        print(f"  Saved: {meta.get('model_version')}")
    else:
        report["saved_model"] = None
        print("  No ML model to save (baselines only)")

    # Step 9: Run anomaly detection
    print("[9/9] Running anomaly detection...")
    anomalies = detect_all_anomalies(headline, route_idx)
    report["anomalies_detected"] = len(anomalies)
    report["anomalies"] = anomalies[:10]  # First 10 for summary
    print(f"  Anomalies detected: {len(anomalies)}")

    report["status"] = "completed"
    report["all_metrics"] = all_results

    # Save report
    report_path = models_dir / "training_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\nTraining complete. Report saved to {report_path}")
    return report


if __name__ == "__main__":
    result = run_training()
    print(f"\nFinal status: {result['status']}")
    if result.get("data_volume_warning"):
        print(f"Data volume warning: {result['data_volume_warning']}")
