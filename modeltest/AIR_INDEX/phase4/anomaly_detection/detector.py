"""Anomaly detection for AIR-INDEX time series.

Methods:
1. Rolling Z-Score (transparent baseline) — primary
2. IQR-based detection
3. Isolation Forest (when data volume supports it)

Output per anomaly: ID, date, route/window, observed, expected,
deviation, score, severity, method, detection timestamp.

IMPORTANT: Never attribute a cause (e.g. "holiday caused this") unless
external evidence is actually joined and cited. Report "anomaly detected"
and let a human interpret.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional
import uuid


class RollingZScoreDetector:
    """Rolling z-score anomaly detection.

    An observation is flagged as anomalous if its z-score (relative to a
    rolling window of past values) exceeds a threshold.
    """

    def __init__(self, window: int = 3, threshold: float = 2.0):
        self.window = window
        self.threshold = threshold
        self.method = "rolling_z_score"

    def detect(
        self,
        series: pd.DataFrame,
        value_col: str = "index_value",
        date_col: str = "period",
        route: Optional[str] = None,
        booking_window: Optional[str] = None,
    ) -> list[dict]:
        """Detect anomalies in a time-indexed series.

        Uses only past values (no future leakage) via shift(1).

        Returns list of anomaly dicts.
        """
        if series.empty or value_col not in series.columns:
            return []

        df = series.sort_values(date_col).copy()
        values = df[value_col].astype(float)

        # Rolling mean and std using only past values (shift to avoid current)
        rolling_mean = values.shift(1).rolling(window=self.window, min_periods=1).mean()
        rolling_std = values.shift(1).rolling(window=self.window, min_periods=1).std()

        # Replace zero std with NaN to avoid division by zero
        rolling_std = rolling_std.replace(0, np.nan)

        z_scores = (values - rolling_mean) / rolling_std

        anomalies = []
        for idx in df.index:
            z = z_scores.get(idx)
            if z is not None and not np.isnan(z) and abs(z) > self.threshold:
                severity = self._severity(abs(z))
                anomalies.append({
                    "anomaly_id": str(uuid.uuid4())[:12],
                    "period": str(df.at[idx, date_col])[:7] if date_col in df.columns else None,
                    "route": route,
                    "booking_window": booking_window,
                    "observed_value": float(values.at[idx]),
                    "expected_value": float(rolling_mean.at[idx]) if not np.isnan(rolling_mean.at[idx]) else None,
                    "deviation": float(values.at[idx] - rolling_mean.at[idx]) if not np.isnan(rolling_mean.at[idx]) else None,
                    "anomaly_score": float(abs(z)),
                    "severity": severity,
                    "method": self.method,
                    "model_version": "ANOMALY_ZSCORE_V1",
                    "detected_at": datetime.now().isoformat(),
                })

        return anomalies

    @staticmethod
    def _severity(z: float) -> str:
        if z >= 3.0:
            return "HIGH"
        elif z >= 2.5:
            return "MEDIUM"
        return "LOW"


class IQRDetector:
    """IQR-based anomaly detection.

    Flags values outside Q1 - k*IQR to Q3 + k*IQR as anomalous.
    """

    def __init__(self, multiplier: float = 1.5):
        self.multiplier = multiplier
        self.method = "iqr"

    def detect(
        self,
        series: pd.DataFrame,
        value_col: str = "index_value",
        date_col: str = "period",
        route: Optional[str] = None,
        booking_window: Optional[str] = None,
    ) -> list[dict]:
        """Detect anomalies using IQR method on the full series.

        Returns list of anomaly dicts.
        """
        if series.empty or value_col not in series.columns:
            return []

        df = series.sort_values(date_col).copy()
        values = df[value_col].dropna().astype(float)

        if len(values) < 3:
            return []  # Need at least 3 points for meaningful IQR

        q1 = values.quantile(0.25)
        q3 = values.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - self.multiplier * iqr
        upper = q3 + self.multiplier * iqr
        median_val = values.median()

        anomalies = []
        for idx in df.index:
            val = df.at[idx, value_col]
            if val is not None and not np.isnan(float(val)):
                val_f = float(val)
                if val_f < lower or val_f > upper:
                    deviation = val_f - median_val
                    score = abs(deviation) / iqr if iqr > 0 else abs(deviation)
                    anomalies.append({
                        "anomaly_id": str(uuid.uuid4())[:12],
                        "period": str(df.at[idx, date_col])[:7] if date_col in df.columns else None,
                        "route": route,
                        "booking_window": booking_window,
                        "observed_value": val_f,
                        "expected_value": float(median_val),
                        "deviation": deviation,
                        "anomaly_score": score,
                        "severity": "HIGH" if score > 3 else ("MEDIUM" if score > 2 else "LOW"),
                        "method": self.method,
                        "model_version": "ANOMALY_IQR_V1",
                        "detected_at": datetime.now().isoformat(),
                    })

        return anomalies


def detect_all_anomalies(
    headline_indices: list[dict],
    route_indices: list[dict] | None = None,
    z_threshold: float = 2.0,
    iqr_multiplier: float = 1.5,
) -> list[dict]:
    """Run all anomaly detectors on headline and route-level index series.

    Args:
        headline_indices: Phase 3 headline_indices output.
        route_indices: Phase 3 route_indices output.
        z_threshold: Z-score threshold for rolling z-score detector.
        iqr_multiplier: IQR multiplier for IQR detector.

    Returns:
        Combined list of detected anomalies from all methods.
    """
    all_anomalies = []

    z_detector = RollingZScoreDetector(threshold=z_threshold)
    iqr_detector = IQRDetector(multiplier=iqr_multiplier)

    # Detect on headline series
    if headline_indices:
        headline_df = pd.DataFrame(headline_indices)
        if "period" in headline_df.columns:
            headline_df["period"] = pd.to_datetime(
                headline_df["period"].astype(str).str[:7] + "-01"
            )
            all_anomalies.extend(z_detector.detect(headline_df))
            all_anomalies.extend(iqr_detector.detect(headline_df))

    # Detect on route-level series
    if route_indices:
        route_df = pd.DataFrame(route_indices)
        if "period" in route_df.columns:
            route_df["period"] = pd.to_datetime(
                route_df["period"].astype(str).str[:7] + "-01"
            )
            for (route, window), group in route_df.groupby(["route", "booking_window"]):
                all_anomalies.extend(
                    z_detector.detect(group, route=route, booking_window=window)
                )
                all_anomalies.extend(
                    iqr_detector.detect(group, route=route, booking_window=window)
                )

    return all_anomalies
