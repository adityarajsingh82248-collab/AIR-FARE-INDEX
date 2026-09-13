from __future__ import annotations
from .methodology import load_config, methodology_metadata
from .route_index import calculate_route_indices
from .airline_index import calculate_airline_indices
from .aggregate_index import calculate_overall_index, calculate_headline_indices
from .weighting import validate_weights

def build_index(observations, root=None):
    cfg,wcfg=load_config(root); weights=validate_weights(wcfg["weights"],cfg["routes"])
    rows=calculate_route_indices(observations,cfg["base"]["development_base_period"],cfg["representative_price"]["method"],cfg["outlier"]["method"],cfg["outlier"]["multiplier"],cfg["quality"]["minimum_observations"],cfg["quality"]["high_threshold"],cfg["quality"]["medium_threshold"])
    for r in rows: r["weight"]=weights.get(r["route"])
    overall=calculate_overall_index(rows,weights,cfg["quality"]["minimum_observations"],cfg["quality"]["high_threshold"],cfg["quality"]["medium_threshold"])
    meta=methodology_metadata(cfg,wcfg)
    modes={o.get("data_mode","UNKNOWN") for o in observations if o.get("usable_for_index")}
    meta["data_mode"]=next(iter(modes)) if len(modes)==1 else ("MIXED" if modes else "UNKNOWN")
    for collection in (rows,overall):
        for row in collection:
            row["data_mode"] = row.get("data_mode") if row.get("data_mode") in modes and len(modes)>1 else meta["data_mode"]
    headlines=calculate_headline_indices(overall,cfg["booking_windows"])
    for row in headlines: row["data_mode"]=meta["data_mode"]
    airline=calculate_airline_indices(observations,cfg["base"]["development_base_period"],cfg["quality"]["minimum_observations"])
    return {"route_indices":rows,"overall_indices":overall,"headline_indices":headlines,"airline_indices":airline,"methodology":meta}
