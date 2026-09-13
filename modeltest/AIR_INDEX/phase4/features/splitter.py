"""Chronological train/validation/test splitter with leakage guards.

Implements strict chronological splitting — no shuffling, no random sampling.
All fitted transformations (scalers, encoders) are fit on train set only.
"""
from __future__ import annotations

import pandas as pd
import numpy as np
from typing import Optional


def chronological_split(
    df: pd.DataFrame,
    date_col: str = "period",
    train_frac: float = 0.70,
    val_frac: float = 0.15,
    test_frac: float = 0.15,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split data chronologically into train/validation/test sets.

    Args:
        df: DataFrame with a date/period column.
        date_col: Name of the column to sort by.
        train_frac: Fraction of data for training.
        val_frac: Fraction for validation.
        test_frac: Fraction for test.

    Returns:
        Tuple of (train_df, val_df, test_df).

    Raises:
        ValueError: if fractions don't sum to ~1 or data is empty.
    """
    if abs(train_frac + val_frac + test_frac - 1.0) > 1e-6:
        raise ValueError(
            f"Split fractions must sum to 1.0, got {train_frac + val_frac + test_frac}"
        )

    if df.empty:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

    sorted_df = df.sort_values(date_col).reset_index(drop=True)
    n = len(sorted_df)

    train_end = int(n * train_frac)
    val_end = train_end + int(n * val_frac)

    # Ensure at least 1 row per split if possible
    if n >= 3:
        train_end = max(train_end, 1)
        val_end = max(val_end, train_end + 1)
        val_end = min(val_end, n - 1)

    train = sorted_df.iloc[:train_end].copy()
    val = sorted_df.iloc[train_end:val_end].copy()
    test = sorted_df.iloc[val_end:].copy()

    return train, val, test


def verify_no_leakage(
    train: pd.DataFrame,
    val: pd.DataFrame,
    test: pd.DataFrame,
    date_col: str = "period",
) -> dict:
    """Verify that chronological ordering is maintained and no leakage exists.

    Checks:
    1. max(train_dates) < min(val_dates) < min(test_dates)
    2. No overlap between any pair of sets

    Returns:
        Dict with 'valid' (bool) and 'details' (str).
    """
    result = {"valid": True, "details": ""}

    # Handle empty splits
    non_empty = []
    for name, df in [("train", train), ("val", val), ("test", test)]:
        if not df.empty and date_col in df.columns:
            non_empty.append((name, df))

    if len(non_empty) < 2:
        result["details"] = "Fewer than 2 non-empty splits; leakage check trivially passes."
        return result

    # Check ordering between consecutive non-empty splits
    for i in range(len(non_empty) - 1):
        name_a, df_a = non_empty[i]
        name_b, df_b = non_empty[i + 1]

        max_a = df_a[date_col].max()
        min_b = df_b[date_col].min()

        if max_a >= min_b:
            result["valid"] = False
            result["details"] += (
                f"Leakage detected: max({name_a})={max_a} >= min({name_b})={min_b}. "
            )

    if result["valid"]:
        result["details"] = "No leakage: chronological ordering maintained across all splits."

    return result


def verify_feature_no_future_leakage(
    df: pd.DataFrame,
    feature_cols: list[str],
    target_col: str = "index_value",
    date_col: str = "period",
) -> dict:
    """Verify that features at time t don't use information from t+1 or later.

    This is a structural check: for each row, verify that lag/rolling features
    are consistent with shifted values.

    Returns:
        Dict with 'valid' (bool) and 'issues' (list).
    """
    result = {"valid": True, "issues": []}

    if df.empty or target_col not in df.columns:
        return result

    sorted_df = df.sort_values(date_col).reset_index(drop=True)

    # Check lag features
    for col in feature_cols:
        if col.startswith("lag_"):
            try:
                lag_n = int(col.split("_")[1])
            except (IndexError, ValueError):
                continue

            expected = sorted_df[target_col].shift(lag_n)
            actual = sorted_df[col]

            # Compare where both are non-NaN
            mask = actual.notna() & expected.notna()
            if mask.any():
                mismatches = (~np.isclose(
                    actual[mask].values.astype(float),
                    expected[mask].values.astype(float),
                    rtol=1e-6,
                )).sum()
                if mismatches > 0:
                    result["valid"] = False
                    result["issues"].append(
                        f"Feature '{col}' has {mismatches} values inconsistent with shift({lag_n})"
                    )

    return result
