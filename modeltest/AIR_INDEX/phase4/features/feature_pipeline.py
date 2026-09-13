"""
Phase 4 feature generation pipeline for AIR-INDEX ML.

Granularity decision (Section 12, option b): Phase 3 computes indices at
MONTHLY granularity only. All features use monthly periods.

Features:
- Temporal: month, quarter, year
- Index: AIR_INDEX value, route index values
- Lag: lag_1, lag_2, lag_3 (prior months)
- Rolling: rolling_mean_3, rolling_std_3 (3-month window)
- Momentum: month-over-month change, percentage change
- Quality: sample_count, route_coverage, quality_score
"""
from __future__ import annotations

import pandas as pd
import numpy as np
from datetime import date
from typing import Optional


def load_index_series(index_results: list[dict]) -> pd.DataFrame:
    """Convert Phase 3 overall_indices or headline_indices to a time-indexed DataFrame.

    Args:
        index_results: list of dicts from Phase 3 build_index()['headline_indices']
                       or overall_indices.

    Returns:
        DataFrame indexed by period (datetime), sorted chronologically.
    """
    if not index_results:
        return pd.DataFrame()

    df = pd.DataFrame(index_results)

    # Ensure period is datetime
    if "period" in df.columns:
        df["period"] = pd.to_datetime(
            df["period"].astype(str).str[:7] + "-01", format="%Y-%m-%d"
        )
    else:
        return pd.DataFrame()

    df = df.sort_values("period").reset_index(drop=True)
    return df


def load_route_index_series(route_indices: list[dict]) -> pd.DataFrame:
    """Convert Phase 3 route_indices to a DataFrame with route-level detail.

    Returns DataFrame with period, route, booking_window, index_value, etc.
    """
    if not route_indices:
        return pd.DataFrame()

    df = pd.DataFrame(route_indices)
    if "period" in df.columns:
        df["period"] = pd.to_datetime(
            df["period"].astype(str).str[:7] + "-01", format="%Y-%m-%d"
        )
    df = df.sort_values(["period", "route", "booking_window"]).reset_index(drop=True)
    return df


def generate_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add temporal features based on period column.

    Monthly granularity: month, quarter, year. No day_of_week.
    """
    out = df.copy()
    if "period" not in out.columns or out.empty:
        return out

    out["month"] = out["period"].dt.month
    out["quarter"] = out["period"].dt.quarter
    out["year"] = out["period"].dt.year
    return out


def generate_lag_features(
    df: pd.DataFrame,
    value_col: str = "index_value",
    lags: list[int] | None = None,
) -> pd.DataFrame:
    """Generate lag features at monthly granularity.

    Args:
        df: DataFrame sorted by period.
        value_col: column to lag.
        lags: list of lag offsets in months (default: [1, 2, 3]).

    Returns:
        DataFrame with lag columns added (lag_1, lag_2, lag_3).
    """
    if lags is None:
        lags = [1, 2, 3]

    out = df.copy()
    if value_col not in out.columns or out.empty:
        return out

    for lag in lags:
        out[f"lag_{lag}"] = out[value_col].shift(lag)
    return out


def generate_rolling_features(
    df: pd.DataFrame,
    value_col: str = "index_value",
    windows: list[int] | None = None,
) -> pd.DataFrame:
    """Generate rolling mean and std at monthly granularity.

    Args:
        df: DataFrame sorted by period.
        value_col: column to compute rolling stats on.
        windows: list of window sizes in months (default: [3]).

    Returns:
        DataFrame with rolling_mean_N and rolling_std_N columns.
    """
    if windows is None:
        windows = [3]

    out = df.copy()
    if value_col not in out.columns or out.empty:
        return out

    for w in windows:
        out[f"rolling_mean_{w}"] = out[value_col].shift(1).rolling(window=w, min_periods=1).mean()
        out[f"rolling_std_{w}"] = out[value_col].shift(1).rolling(window=w, min_periods=1).std()
    return out


def generate_momentum_features(
    df: pd.DataFrame, value_col: str = "index_value"
) -> pd.DataFrame:
    """Generate month-over-month change and percentage change.

    Args:
        df: DataFrame sorted by period.
        value_col: column to compute momentum on.
    """
    out = df.copy()
    if value_col not in out.columns or out.empty:
        return out

    out["mom_change"] = out[value_col].diff()
    prev = out[value_col].shift(1)
    out["mom_pct_change"] = np.where(
        prev != 0, out["mom_change"] / prev * 100, np.nan
    )
    return out


def generate_quality_features(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure quality columns are present as features.

    Expected columns: sample_count, route_coverage, quality_score.
    """
    out = df.copy()
    for col in ["sample_count", "route_coverage", "quality_score"]:
        if col not in out.columns:
            out[col] = np.nan
    return out


def build_feature_dataset(
    headline_indices: list[dict],
    route_indices: list[dict] | None = None,
    lags: list[int] | None = None,
    rolling_windows: list[int] | None = None,
) -> pd.DataFrame:
    """Build complete feature dataset from Phase 3 index outputs.

    This is the main entry point for feature generation. It:
    1. Loads headline index series
    2. Adds temporal features
    3. Adds lag features (monthly)
    4. Adds rolling statistics (monthly)
    5. Adds momentum features
    6. Adds quality features

    All operations respect chronological ordering. No future information
    leaks into features at time t.

    Args:
        headline_indices: Phase 3 headline_indices output.
        route_indices: Optional Phase 3 route_indices for route-level features.
        lags: lag offsets in months.
        rolling_windows: rolling window sizes in months.

    Returns:
        Feature DataFrame ready for model training.
    """
    df = load_index_series(headline_indices)
    if df.empty:
        return df

    df = generate_temporal_features(df)
    df = generate_lag_features(df, lags=lags)
    df = generate_rolling_features(df, windows=rolling_windows)
    df = generate_momentum_features(df)
    df = generate_quality_features(df)

    # Add route-level index values as cross-sectional features
    if route_indices:
        route_df = load_route_index_series(route_indices)
        if not route_df.empty:
            # Pivot route indices to create one column per route
            # Use median across booking windows for each route-period
            route_pivot = (
                route_df.groupby(["period", "route"])["index_value"]
                .median()
                .unstack(level="route")
            )
            route_pivot.columns = [f"route_idx_{c}" for c in route_pivot.columns]
            route_pivot = route_pivot.reset_index()
            df = df.merge(route_pivot, on="period", how="left")

    return df


def get_feature_columns(df: pd.DataFrame) -> list[str]:
    """Return list of feature column names (excluding target, metadata, period)."""
    exclude = {
        "period", "index_value", "booking_window", "methodology_version",
        "data_mode", "quality_status",
    }
    return [c for c in df.columns if c not in exclude and not c.startswith("_")]


def get_target_column() -> str:
    """Return the target column name for forecasting."""
    return "index_value"
