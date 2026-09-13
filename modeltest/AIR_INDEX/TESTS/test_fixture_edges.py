from pathlib import Path
import pandas as pd
from PIPELINE.run_collection import _fixture_rows
from PIPELINE.process_observations import process


def test_fixture_covers_required_edge_cases():
    rows=_fixture_rows(__import__('datetime').date(2026,9,8))
    out=process(rows)
    assert len(out) >= 30
    statuses={x["availability"] for x in out}
    flags={x["duplicate_flag"] for x in out}
    assert {"AVAILABLE","SOLD_OUT","MISSING","UNKNOWN"}.issubset(statuses)
    assert "TRUE_DUPLICATE_SAME_TIMESTAMP" in flags
    assert "INTRADAY_REPEAT_CHECK" in flags
    assert any("fare_inconsistent" in (x.get("validation_reason") or "") for x in out)
    assert any("travel_before_search" in (x.get("validation_reason") or "") for x in out)
    assert any("invalid_base_fare" in (x.get("validation_reason") or "") for x in out)
    assert all(x.get("source")=="MOCK_FIXTURE" for x in rows)
