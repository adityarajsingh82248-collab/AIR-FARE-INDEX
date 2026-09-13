from datetime import date
from UTILS.timestamps import travel_date_for

def test_travel_date():
    assert travel_date_for(date(2026,9,8),7).isoformat()=="2026-09-15"
