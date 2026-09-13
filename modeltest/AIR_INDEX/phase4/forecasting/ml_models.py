"""ML candidate models for AIR-INDEX forecasting.

Candidate models: Linear Regression, Random Forest, Gradient Boosting.
These are compared against baselines — the simpler model wins if it
performs as well or better.

All models implement a fit/predict interface consistent with sklearn.
"""
from __future__ import annotations

import numpy as np
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Any

try:
    from sklearn.linear_model import LinearRegression
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class ForecastModel:
    """Wrapper around sklearn models for AIR-INDEX forecasting."""

    def __init__(self, model_type: str = "linear_regression", **kwargs):
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for ML models")

        self.model_type = model_type
        self.model = self._create_model(model_type, **kwargs)
        self.name = model_type
        self.is_fitted = False
        self.feature_names: list[str] = []
        self.training_date: Optional[str] = None
        self.training_period: Optional[dict] = None

    @staticmethod
    def _create_model(model_type: str, **kwargs):
        """Create sklearn model instance."""
        if model_type == "linear_regression":
            return LinearRegression(**kwargs)
        elif model_type == "random_forest":
            return RandomForestRegressor(
                n_estimators=kwargs.get("n_estimators", 100),
                random_state=kwargs.get("random_state", 42),
                max_depth=kwargs.get("max_depth", None),
            )
        elif model_type == "gradient_boosting":
            return GradientBoostingRegressor(
                n_estimators=kwargs.get("n_estimators", 100),
                random_state=kwargs.get("random_state", 42),
                learning_rate=kwargs.get("learning_rate", 0.1),
                max_depth=kwargs.get("max_depth", 3),
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")

    def fit(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        feature_names: list[str] | None = None,
        train_period: dict | None = None,
    ) -> "ForecastModel":
        """Fit the model on training data.

        Args:
            X_train: Feature matrix.
            y_train: Target values.
            feature_names: Names of feature columns.
            train_period: Dict with 'start' and 'end' dates of training period.
        """
        if len(X_train) == 0:
            raise ValueError("Cannot fit on empty training data")

        self.model.fit(X_train, y_train)
        self.is_fitted = True
        self.feature_names = feature_names or []
        self.training_date = datetime.now().isoformat()
        self.training_period = train_period
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Generate predictions."""
        if not self.is_fitted:
            raise RuntimeError("Model not fitted")
        return self.model.predict(X)

    def metadata(self) -> dict:
        """Return model metadata for registry."""
        return {
            "model_type": self.model_type,
            "name": self.name,
            "is_fitted": self.is_fitted,
            "feature_names": self.feature_names,
            "training_date": self.training_date,
            "training_period": self.training_period,
        }


def save_model(model: ForecastModel, path: str | Path, metrics: dict | None = None,
               methodology_version: str = "AIR_INDEX_V1") -> dict:
    """Save model artifact and metadata to disk.

    Args:
        model: Fitted ForecastModel.
        path: Directory to save model files.
        metrics: Evaluation metrics dict.
        methodology_version: Phase 3 methodology version tied to this model.

    Returns:
        Dict with artifact paths and metadata.
    """
    import joblib

    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)

    version = f"AIR_FORECAST_V1_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    # Save model
    model_path = path / f"{version}.joblib"
    joblib.dump(model.model, model_path)

    # Save metadata
    meta = {
        "model_version": version,
        "model_type": model.model_type,
        "methodology_version": methodology_version,
        "training_date": model.training_date,
        "training_period": model.training_period,
        "feature_names": model.feature_names,
        "feature_count": len(model.feature_names),
        "metrics": metrics or {},
        "artifact_path": str(model_path),
        "created_at": datetime.now().isoformat(),
        "data_mode": "DEVELOPMENT_SYNTHETIC",
    }

    meta_path = path / f"{version}_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2, default=str)

    return meta


def load_model(path: str | Path) -> tuple[Any, dict]:
    """Load a saved model and its metadata.

    Args:
        path: Path to the .joblib model file.

    Returns:
        Tuple of (sklearn model, metadata dict).
    """
    import joblib

    path = Path(path)
    model = joblib.load(path)

    meta_path = path.with_suffix("").with_name(path.stem + "_metadata.json")
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
    else:
        meta = {}

    return model, meta


def fit_all_candidates(
    X_train: np.ndarray,
    y_train: np.ndarray,
    feature_names: list[str] | None = None,
    train_period: dict | None = None,
) -> dict[str, ForecastModel]:
    """Fit all candidate ML models.

    Returns dict mapping model name -> fitted model.
    """
    candidates = {}

    for model_type in ["linear_regression", "random_forest", "gradient_boosting"]:
        try:
            model = ForecastModel(model_type=model_type)
            model.fit(X_train, y_train, feature_names=feature_names,
                      train_period=train_period)
            candidates[model.name] = model
        except Exception as e:
            # Log but don't fail — some models may not work with very small data
            print(f"Warning: {model_type} failed to fit: {e}")

    return candidates
