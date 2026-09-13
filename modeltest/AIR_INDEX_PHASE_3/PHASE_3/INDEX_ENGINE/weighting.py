from __future__ import annotations

def validate_weights(weights, expected_routes=None):
    if not weights: raise ValueError("No route weights configured")
    clean={str(k).upper():float(v) for k,v in weights.items()}
    if any(v < 0 for v in clean.values()): raise ValueError("Route weights cannot be negative")
    if expected_routes is not None and set(clean) != {str(r).upper() for r in expected_routes}: raise ValueError("Configured route weights must match the configured representative routes")
    total=sum(clean.values())
    if abs(total-1.0)>1e-6: raise ValueError(f"Route weights must sum to 1; got {total}")
    return clean

def weighted_average(rows, weights):
    usable=[r for r in rows if r.get("index_value") is not None and r.get("route") in weights and r.get("status")=="VALID"]
    if not usable: return None
    denom=sum(weights[r["route"]] for r in usable)
    return sum(weights[r["route"]]*float(r["index_value"]) for r in usable)/denom if denom else None
