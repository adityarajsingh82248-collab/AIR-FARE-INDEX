from __future__ import annotations

def quality_score(sample_count, missing_rate=0.0, duplicate_rate=0.0, outlier_rate=0.0, source_count=1, airline_count=1, minimum_observations=3, route_coverage=1.0, high_threshold=0.85, medium_threshold=0.60):
    sample_factor=min(1.0, sample_count/max(minimum_observations,1))
    diversity=min(1.0, (source_count+airline_count)/4)
    coverage=max(0.0,min(1.0,float(route_coverage)))
    score=max(0.0,min(1.0,0.45*sample_factor+0.15*(1-missing_rate)+0.10*(1-duplicate_rate)+0.05*(1-outlier_rate)+0.10*diversity+0.15*coverage))
    if sample_count==0: status="INSUFFICIENT_DATA"
    elif score>=high_threshold and coverage>=1.0: status="HIGH"
    elif score>=medium_threshold: status="MEDIUM"
    else: status="LOW"
    return {"quality_score":round(score,4),"quality_status":status}
