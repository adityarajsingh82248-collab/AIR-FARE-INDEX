"""Baseline forecasting models for AIR-INDEX.

Baselines must always be kept and compared against ML models.
These are transparent, interpretable models that serve as the
minimum performance bar any ML model must beat.

Granularity: monthly (per Section 12 decision, option b).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from typing import Optional


class NaiveBaseline:
    """Naive previous-value baseline: forecast = last observed value.

    This is the simplest possible baseline. Any useful model must beat it.
    """

    def __init__(self):
        self.name = "naive_previous_value"
        self.last_value: Optional[float] = None

    def fit(self, y_train: np.ndarray) -> "NaiveBaseline":
        """Fit by storing the last training value."""
        if len(y_train) == 0:
            raise ValueError("Cannot fit NaiveBaseline on empty data")
        self.last_value = float(y_train[-1])
        return self

    def predict(self, horizon: int = 1) -> np.ndarray:
        """Predict: repeat last value for each horizon step."""
        if self.last_value is None:
            raise RuntimeError("Model not fitted")
        return np.full(horizon, self.last_value)


class MovingAverageBaseline:
    """Moving average baseline: forecast = mean of last N observations.

    Args:
        window: number of past periods to average (default: 3 months).
    """

    def __init__(self, window: int = 3):
        self.name = f"moving_average_{window}"
        self.window = window
        self.avg_value: Optional[float] = None

    def fit(self, y_train: np.ndarray) -> "MovingAverageBaseline":
        """Fit by computing the mean of the last `window` training values."""
        if len(y_train) == 0:
            raise ValueError("Cannot fit MovingAverageBaseline on empty data")
        actual_window = min(self.window, len(y_train))
        self.avg_value = float(np.mean(y_train[-actual_window:]))
        return self

    def predict(self, horizon: int = 1) -> np.ndarray:
        """Predict: repeat the moving average for each horizon step."""
        if self.avg_value is None:
            raise RuntimeError("Model not fitted")
        return np.full(horizon, self.avg_value)


def fit_all_baselines(
    y_train: np.ndarray,
) -> dict[str, NaiveBaseline | MovingAverageBaseline]:
    """Fit all baseline models on training data.

    Returns dict mapping model name -> fitted model.

    Note: ARIMA/SARIMA is intentionally skipped when data volume is
    insufficient (< 12 monthly observations). This is an explicit decision,
    not an oversight. With only 2 monthly data points in the current
    development dataset, statistical time-series models cannot be
    meaningfully estimated.
    """
    baselines = {}

    naive = NaiveBaseline()
    naive.fit(y_train)
    baselines[naive.name] = naive

    for window in [3]:
        ma = MovingAverageBaseline(window=window)
        ma.fit(y_train)
        baselines[ma.name] = ma

    return baselines
