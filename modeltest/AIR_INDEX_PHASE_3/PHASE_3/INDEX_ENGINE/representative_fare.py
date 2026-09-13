from __future__ import annotations
from statistics import median, mean
import math

def _clean(values):
    return [float(v) for v in values if v is not None and math.isfinite(float(v)) and float(v) > 0]

def representative_fare(values, method="median"):
    vals=_clean(values)
    if not vals: return None
    if method == "median": return float(median(vals))
    if method == "mean": return float(mean(vals))
    raise ValueError(f"Unsupported representative method: {method}")

def fare_summary(values):
    vals=sorted(_clean(values))
    if not vals: return {"representative_price":None,"mean":None,"median":None,"minimum":None,"maximum":None,"observation_count":0}
    return {"representative_price":float(median(vals)),"mean":float(mean(vals)),"median":float(median(vals)),"minimum":float(vals[0]),"maximum":float(vals[-1]),"observation_count":len(vals)}
