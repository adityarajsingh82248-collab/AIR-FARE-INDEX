from datetime import date, time, datetime
from PIPELINE.normalization import canonical_airline, normalize_availability, normalize_observation

def test_airline_normalization():
    assert canonical_airline("AIR INDIA")=="Air India"
    assert canonical_airline("indigo")=="IndiGo"

def test_availability_normalization():
    assert normalize_availability("sold out")=="SOLD_OUT"
    assert normalize_availability("unavailable")=="MISSING"
    assert normalize_availability("unknown")=="UNKNOWN"

def test_lead_time_is_calculated():
    raw={"origin":"DEL","destination":"BOM","airline":"IndiGo",
         "travel_date":"2026-09-15","search_date":"2026-09-08",
         "search_time":"10:30:00","lead_time":"T+7","fare_class":"Economy",
         "base_fare":"5000","taxes":"500","fees":"50","total_fare":"5550",
         "availability":"available","source":"TEST","timestamp":"2026-09-08T10:30:00"}
    out=normalize_observation(raw)
    assert out["lead_time_days"]==7
