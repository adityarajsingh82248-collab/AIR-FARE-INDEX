"""Fast inference path for AIR-INDEX forecasting.

Inference is a separate, fast path from training:
current data → features → load saved model → predict.

NEVER trains a model inside this module.
"""
from __future__ import annotations

import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional

ROOT = Path(__file__).resolve().parents[2]


def find_latest_model(models_dir: Optional[Path] = None) -> tuple[Optional[Path], dict]:
    """Find the latest saved model in the models directory.

    Returns (model_path, metadata) or (None, {}) if no model exists.
    """
    if models_dir is None:
        models_dir = ROOT / "phase4" / "models"

    if not models_dir.exists():
        return None, {}

    # Find all metadata files
    meta_files = sorted(models_dir.glob("*_metadata.json"), reverse=True)
    if not meta_files:
        return None, {}

    # Load latest metadata
    with open(meta_files[0]) as f:
        meta = json.load(f)

    model_path = Path(meta.get("artifact_path", ""))
    if not model_path.exists():
        # Try relative to models_dir
        model_path = models_dir / model_path.name
    if not model_path.exists():
        return None, meta

    return model_path, meta


def predict_forecast(
    features_df: pd.DataFrame,
    model_path: Optional[Path] = None,
    metadata: Optional[dict] = None,
) -> dict:
    """Generate forecast from features using a saved model.

    Args:
        features_df: Feature DataFrame (from build_feature_dataset).
        model_path: Path to saved model .joblib file.
        metadata: Model metadata dict.

    Returns:
        Dict with predictions, metadata, and forecast details.
    """
    import joblib

    if model_path is None:
        model_path, metadata = find_latest_model()

    if model_path is None or not model_path.exists():
        return {
            "status": "error",
            "error": "No trained model found. Run training first.",
            "data_mode": "DEVELOPMENT_SYNTHETIC",
        }

    if metadata is None:
        meta_path = model_path.with_name(model_path.stem + "_metadata.json")
        if meta_path.exists():
            with open(meta_path) as f:
                metadata = json.load(f)
        else:
            metadata = {}

    model = joblib.load(model_path)
    feature_names = metadata.get("feature_names", [])

    if not feature_names:
        return {
            "status": "error",
            "error": "Model metadata missing feature_names",
            "data_mode": "DEVELOPMENT_SYNTHETIC",
        }

    # Prepare features
    available = [f for f in feature_names if f in features_df.columns]
    missing = [f for f in feature_names if f not in features_df.columns]

    X = features_df[available].fillna(0).values
    # Add zero columns for missing features
    if missing:
        X = np.column_stack([X, np.zeros((len(X), len(missing)))])

    predictions = model.predict(X)

    # Build forecast response
    result = {
        "status": "success",
        "model_version": metadata.get("model_version", "unknown"),
        "model_type": metadata.get("model_type", "unknown"),
        "methodology_version": metadata.get("methodology_version", "AIR_INDEX_V1"),
        "data_mode": metadata.get("data_mode", "DEVELOPMENT_SYNTHETIC"),
        "forecast_horizon": "next_period_monthly",
        "generated_at": datetime.now().isoformat(),
        "predictions": [],
    }

    for i, pred in enumerate(predictions):
        period = None
        if "period" in features_df.columns:
            period = str(features_df.iloc[i]["period"])[:7]

        result["predictions"].append({
            "period": period,
            "predicted_value": float(pred),
            "lower_bound": float(pred * 0.95),  # Simple confidence interval
            "upper_bound": float(pred * 1.05),
        })

    return result
