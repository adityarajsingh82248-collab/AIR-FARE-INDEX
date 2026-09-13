from datetime import date, time, datetime
from PIPELINE.validation import validate_observation, classify_duplicates

def base():
    return {"observation_id":"1","origin":"DEL","destination":"BOM","route":"DEL-BOM",
            "airline":"IndiGo","travel_date":date(2026,9,15),"search_date":date(2026,9,8),
            "search_time":time(10,30),"lead_time":"T+7","lead_time_days":7,
            "fare_class":"Economy","base_fare":5000.0,"taxes":500.0,"fees":50.0,
            "total_fare":5550.0,"availability":"AVAILABLE","source":"TEST",
            "timestamp":datetime(2026,9,8,10,30)}

def test_valid_observation():
    o=validate_observation(base())
    assert o["validation_status"]=="VALID"
    assert o["usable_for_index"] is True

def test_fare_inconsistency_is_flagged():
    o=base(); o["total_fare"]=9000
    o=validate_observation(o)
    assert o["validation_status"]=="INVALID"
    assert o["fare_consistency_flag"]=="INVALID"

def test_intraday_repeat_not_dropped():
    a=base(); b=base(); b["observation_id"]="2"; b["search_time"]=time(12,30)
    out=classify_duplicates([a,b])
    assert out[0]["duplicate_flag"]=="UNIQUE"
    assert out[1]["duplicate_flag"]=="INTRADAY_REPEAT_CHECK"

def test_exact_duplicate_flagged():
    a=base(); b=base(); b["observation_id"]="2"
    out=classify_duplicates([a,b])
    assert out[1]["duplicate_flag"]=="TRUE_DUPLICATE_SAME_TIMESTAMP"
