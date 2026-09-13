from __future__ import annotations
from collections import defaultdict
from .weighting import weighted_average
from .quality import quality_score

def calculate_overall_index(route_rows, weights, minimum_observations=3, high_threshold=0.85, medium_threshold=0.60):
    groups=defaultdict(list)
    for r in route_rows: groups[(r["period"],r["booking_window"])].append(r)
    out=[]
    for (period,window),rows in sorted(groups.items()):
        valid=[r for r in rows if r.get("index_value") is not None and r.get("route") in weights and r.get("status")=="VALID"]
        value=weighted_average(rows,weights)
        coverage=len({r["route"] for r in valid})/len(weights) if weights else 0
        sample=sum(r.get("sample_count",0) for r in valid)
        q=quality_score(sample,route_coverage=coverage,minimum_observations=minimum_observations,high_threshold=high_threshold,medium_threshold=medium_threshold)
        modes=sorted({r.get("data_mode","UNKNOWN") for r in rows})
        out.append({"period":period,"booking_window":window,"index_value":value,"sample_count":sample,"route_coverage":coverage,"quality_score":q["quality_score"],"quality_status":q["quality_status"],"data_mode":modes[0] if len(modes)==1 else "MIXED","methodology_version":"AIR_INDEX_V1"})
    return out

def calculate_headline_indices(overall_indices, booking_windows):
    groups=defaultdict(list)
    for r in overall_indices:
        if r.get("index_value") is not None and r.get("booking_window") in booking_windows: groups[r["period"]].append(r)
    out=[]
    for period,rows in sorted(groups.items()):
        value=sum(float(r["index_value"]) for r in rows)/len(rows)
        coverage=sum(r.get("route_coverage",0) for r in rows)/len(rows)
        quality=sum(r.get("quality_score",0) for r in rows)/len(rows)
        modes=sorted({r.get("data_mode","UNKNOWN") for r in rows})
        status="HIGH" if quality>=0.85 and coverage>=1 else ("MEDIUM" if quality>=0.60 else "LOW")
        out.append({"period":period,"booking_window":"ALL","index_value":value,"sample_count":sum(r.get("sample_count",0) for r in rows),"route_coverage":coverage,"quality_score":round(quality,4),"quality_status":status,"data_mode":modes[0] if len(modes)==1 else "MIXED","methodology_version":"AIR_INDEX_V1"})
    return out
