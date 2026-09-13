"""Evaluation metrics for AIR-INDEX forecasting models.

Metrics: MAE, RMSE, sMAPE. All computed on actual values only (never fabricated).
sMAPE is preferred over MAPE because it handles near-zero denominators better,
though for index values near 100 (the base), both are usually fine.
"""
from __future__ import annotations

import numpy as np
from typing import Optional


def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Error."""
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return float("nan")
    return float(np.mean(np.abs(y_true - y_pred)))


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Root Mean Squared Error."""
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return float("nan")
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def smape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Symmetric Mean Absolute Percentage Error.

    sMAPE = 100/n * Σ |y_true - y_pred| / ((|y_true| + |y_pred|) / 2)

    Preferred over MAPE because it's symmetric and handles near-zero values.
    For AIR-INDEX values near 100, both MAPE and sMAPE give similar results,
    but sMAPE is more robust in edge cases.
    """
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return float("nan")
    denom = (np.abs(y_true) + np.abs(y_pred)) / 2
    # Avoid division by zero
    mask = denom > 0
    if not mask.any():
        return float("nan")
    return float(100 * np.mean(np.abs(y_true[mask] - y_pred[mask]) / denom[mask]))


def evaluate_model(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    model_name: str = "unknown",
) -> dict:
    """Compute all evaluation metrics for a model.

    Args:
        y_true: Actual values.
        y_pred: Predicted values.
        model_name: Name of the model for reporting.

    Returns:
        Dict with model_name, mae, rmse, smape, n_samples.
    """
    return {
        "model_name": model_name,
        "mae": mae(y_true, y_pred),
        "rmse": rmse(y_true, y_pred),
        "smape": smape(y_true, y_pred),
        "n_samples": len(y_true),
    }


def compare_models(results: list[dict], primary_metric: str = "mae") -> dict:
    """Compare multiple models and select the best one.

    Args:
        results: List of evaluation result dicts from evaluate_model().
        primary_metric: Metric to use for selection (lower is better).

    Returns:
        Dict with 'best_model', 'rankings', 'recommendation'.
    """
    if not results:
        return {"best_model": None, "rankings": [], "recommendation": "No models to compare"}

    # Filter out models with NaN primary metric
    valid = [r for r in results if not np.isnan(r.get(primary_metric, float("nan")))]
    if not valid:
        return {
            "best_model": None,
            "rankings": results,
            "recommendation": "All models produced NaN metrics (likely insufficient data)",
        }

    sorted_results = sorted(valid, key=lambda r: r[primary_metric])
    best = sorted_results[0]

    return {
        "best_model": best["model_name"],
        "rankings": sorted_results,
        "recommendation": (
            f"Best model: {best['model_name']} "
            f"({primary_metric}={best[primary_metric]:.4f})"
        ),
    }
