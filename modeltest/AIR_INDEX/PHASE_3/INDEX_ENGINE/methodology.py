from __future__ import annotations
import yaml
from pathlib import Path

def load_config(root=None):
    root=Path(root or Path(__file__).resolve().parents[1])
    with (root/"CONFIG"/"index_config.yaml").open(encoding="utf-8") as f: cfg=yaml.safe_load(f) or {}
    with (root/"CONFIG"/"weights.yaml").open(encoding="utf-8") as f: weights=yaml.safe_load(f) or {}
    return cfg,weights

def methodology_metadata(cfg, weights):
    return {
        "methodology_version":cfg["methodology_version"],
        "base_period":cfg["base"]["development_base_period"],
        "base_index":cfg["base"]["index_value"],
        "representative_price_method":cfg["representative_price"]["method"],
        "outlier_method":cfg["outlier"]["method"],
        "outlier_multiplier":cfg["outlier"]["multiplier"],
        "booking_windows":cfg["booking_windows"],
        "routes":cfg["routes"],
        "fare_definition":cfg["fare_definition"],
        "cabin":cfg["cabin"],
        "weight_source_status":weights.get("source_status"),
        "weight_method":weights.get("method"),
        "weights":weights.get("weights",{}),
        "quality_thresholds":cfg["quality"],
        "data_mode":"DEVELOPMENT_SYNTHETIC",
        "data_source_rules":{
            "development_data_mode":"DEVELOPMENT_SYNTHETIC",
            "production_input":"authorized Phase 2 observations only",
            "live_status_claim":"not permitted from development data"
        }
    }
