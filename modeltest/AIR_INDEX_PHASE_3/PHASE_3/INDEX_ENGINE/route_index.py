from __future__ import annotations
from collections import defaultdict
from .representative_fare import representative_fare, fare_summary
from .base_index import base_100
from .outlier import filter_outliers
from .quality import quality_score

def calculate_route_indices(observations, base_period, method="median", outlier_method="iqr", outlier_multiplier=1.5, minimum_observations=3, high_threshold=0.85, medium_threshold=0.60):
    groups=defaultdict(list)
    for o in observations:
        if not o.get("usable_for_index"): continue
        fare=o.get("total_fare")
        if fare is None or o.get("currency","INR")!="INR": continue
        route=(o.get("route") or f"{o.get('origin')}-{o.get('destination')}").upper()
        d=o.get("search_date"); period=d.strftime("%Y-%m") if hasattr(d,"strftime") else str(d)[:7]
        groups[(route,o.get("lead_time"),o.get("fare_class","Economy"),period)].append(o)
    series=defaultdict(dict); stats={}
    for (route,window,cabin,period),rows in groups.items():
        vals=[r["total_fare"] for r in rows]; filtered,removed=filter_outliers(vals,outlier_method,outlier_multiplier); summary=fare_summary(filtered)
        if summary["representative_price"] is None: continue
        series[(route,window)][period]=summary["representative_price"]; stats[(route,window,period)]=(len(vals),removed,rows,summary)
    out=[]
    for (route,window),periods in series.items():
        base_price=periods.get(base_period)
        for period,price in sorted(periods.items()):
            sample,removed,rows,summary=stats[(route,window,period)]
            idx=base_100(price,base_price)
            duplicate_rate=sum(1 for r in rows if str(r.get("duplicate_flag","UNIQUE")).upper()!="UNIQUE")/max(sample,1)
            q=quality_score(sample,duplicate_rate=duplicate_rate,outlier_rate=removed/max(sample,1),source_count=len({r.get("source") for r in rows}),airline_count=len({r.get("airline") for r in rows}),minimum_observations=minimum_observations,high_threshold=high_threshold,medium_threshold=medium_threshold)
            status="MISSING_BASE" if base_price is None else ("INSUFFICIENT_DATA" if sample<minimum_observations or idx is None else "VALID")
            out.append({"period":period,"route":route,"booking_window":window,"representative_price":price,"mean_price":summary["mean"],"median_price":summary["median"],"minimum_price":summary["minimum"],"maximum_price":summary["maximum"],"base_price":base_price,"index_value":idx,"sample_count":sample,"outlier_count":removed,"weight":None,"data_mode":rows[0].get("data_mode","UNKNOWN"),"methodology_version":"AIR_INDEX_V1","status":status,**q})
    return out
