from __future__ import annotations
from pathlib import Path
import pandas as pd

def load_phase2_fixture(root=None):
    root=Path(root or Path(__file__).resolve().parents[2])
    p=root/"DATA"/"processed"/"fixture_validated.csv"
    df=pd.read_csv(p)
    for c in ["travel_date","search_date","timestamp"]:
        df[c]=pd.to_datetime(df[c])
    return df.to_dict("records")
