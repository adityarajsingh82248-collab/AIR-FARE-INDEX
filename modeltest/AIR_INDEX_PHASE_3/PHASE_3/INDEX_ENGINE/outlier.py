from __future__ import annotations
import numpy as np

def iqr_mask(values, multiplier=1.5):
    arr=np.asarray(values,dtype=float)
    if arr.size < 4: return np.ones(arr.size,dtype=bool)
    q1,q3=np.percentile(arr,[25,75]); iqr=q3-q1
    if iqr == 0: return np.ones(arr.size,dtype=bool)
    return (arr >= q1-multiplier*iqr) & (arr <= q3+multiplier*iqr)

def filter_outliers(values, method="iqr", multiplier=1.5):
    vals=[float(v) for v in values if v is not None]
    if method == "none" or len(vals)<4: return vals, 0
    mask=iqr_mask(vals,multiplier)
    kept=[v for v,m in zip(vals,mask) if m]
    return kept, len(vals)-len(kept)
