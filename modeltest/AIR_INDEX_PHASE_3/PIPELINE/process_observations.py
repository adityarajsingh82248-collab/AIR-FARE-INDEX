"""Process raw observations into Phase 1-compatible validated rows."""
from __future__ import annotations
from .normalization import normalize_observation
from .validation import validate_observation, classify_duplicates


def process(observations: list[dict]) -> list[dict]:
    normalized=[]
    for raw in observations:
        try:
            normalized.append(normalize_observation(raw))
        except Exception as exc:
            failed = dict(raw)
            failed["validation_status"] = "INVALID"
            failed["validation_reason"] = f"normalization_error:{type(exc).__name__}:{exc}"
            failed["usable_for_index"] = False
            failed["duplicate_flag"] = "NOT_CLASSIFIED"
            normalized.append(failed)
    validated=[validate_observation(o) for o in normalized]
    return classify_duplicates(validated)
