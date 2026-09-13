from __future__ import annotations
from collections import defaultdict
from .representative_fare import representative_fare
from .base_index import base_100

def calculate_airline_indices(observations, base_period, minimum_observations=3):
    groups=defaultdict(list)
    for o in observations:
        if not o.get("usable_for_index") or o.get("currency","INR")!="INR":
            continue
        fare=o.get("total_fare")
        if fare is None:
            continue
        try:
            fare=float(fare)
        except (TypeError,ValueError):
            continue
        if fare<=0:
            continue
        route=(o.get("route") or f"{o.get('origin')}-{o.get('destination')}").upper()
        window=o.get("lead_time") or o.get("booking_window")
        airline=o.get("airline")
        period=str(o.get("search_date"))[:7]
        if not route or not window or not airline or len(period)!=7:
            continue
        groups[(route,window,airline,period)].append(fare)
    base={}; current=[]
    for (route,window,airline,period),vals in sorted(groups.items()):
        p=representative_fare(vals,"median")
        if period==base_period:
            base[(route,window,airline)]=p
        current.append((route,window,airline,period,p,len(vals)))
    out=[]
    for route,window,airline,period,price,n in current:
        base_price=base.get((route,window,airline))
        idx=base_100(price,base_price) if n>=minimum_observations else None
        status="VALID" if n>=minimum_observations and base_price is not None and idx is not None else ("MISSING_BASE" if n>=minimum_observations and base_price is None else "INSUFFICIENT_DATA")
        out.append({"route":route,"booking_window":window,"airline":airline,"period":period,"representative_price":price,"base_price":base_price,"index_value":idx,"sample_count":n,"status":status,"data_mode":_mode_for_group(observations,route,window,airline,period),"methodology_version":"AIR_INDEX_V1"})
    return out

def _mode_for_group(observations,route,window,airline,period):
    modes=set()
    for o in observations:
        r=(o.get("route") or f"{o.get('origin')}-{o.get('destination')}").upper()
        w=o.get("lead_time") or o.get("booking_window")
        if r==route and w==window and o.get("airline")==airline and str(o.get("search_date"))[:7]==period:
            modes.add(o.get("data_mode","UNKNOWN"))
    return next(iter(modes)) if len(modes)==1 else ("MIXED" if modes else "UNKNOWN")
