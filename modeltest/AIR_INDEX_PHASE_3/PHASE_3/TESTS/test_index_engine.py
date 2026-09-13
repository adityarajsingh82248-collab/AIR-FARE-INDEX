from pathlib import Path
import pandas as pd
import pytest
from PHASE_3.INDEX_ENGINE.base_index import base_100
from PHASE_3.INDEX_ENGINE.representative_fare import representative_fare
from PHASE_3.INDEX_ENGINE.weighting import validate_weights, weighted_average
from PHASE_3.INDEX_ENGINE.route_index import calculate_route_indices
from PHASE_3.INDEX_ENGINE.airline_index import calculate_airline_indices
from PHASE_3.INDEX_ENGINE.quality import quality_score


def test_base_index_examples():
    assert base_100(4000,4000)==100
    assert base_100(4800,4000)==120
    assert base_100(4000,5000)==80
    assert base_100(4000,0) is None
    assert base_100(-1,4000) is None
    assert base_100(None,4000) is None


def test_representative_median_resists_outlier():
    assert representative_fare([3900,4000,4100,4200,15000])==4100


def test_weights():
    w=validate_weights({"A":0.5,"B":0.5})
    assert weighted_average([{"route":"A","index_value":120,"status":"VALID"},{"route":"B","index_value":100,"status":"VALID"}],w)==110
    with pytest.raises(ValueError): validate_weights({"A":0.7,"B":0.5})
    with pytest.raises(ValueError): validate_weights({"A":-0.1,"B":1.1})


def _obs():
    return [
      {"route":"DEL-BOM","lead_time":"T+1","fare_class":"Economy","search_date":pd.Timestamp(period+"-15"),"total_fare":fare,"currency":"INR","usable_for_index":True,"airline":airline,"source":"S","data_mode":"DEVELOPMENT_SYNTHETIC","duplicate_flag":"UNIQUE"}
      for period,fare,airline in [("2026-09",4000,"A"),("2026-09",4000,"B"),("2026-09",4000,"C"),("2026-10",4800,"A"),("2026-10",4800,"B"),("2026-10",4800,"C")]
    ]


def test_route_index_base_increase_and_missing_base():
    rows=calculate_route_indices(_obs(),"2026-09",minimum_observations=3)
    current=[r for r in rows if r['period']=='2026-10'][0]
    assert current['index_value']==pytest.approx(120.0,rel=1e-3)
    missing=calculate_route_indices([r for r in _obs() if str(r['search_date'])[:7]!='2026-09'],"2026-09")
    assert missing[0]['status']=='MISSING_BASE' and missing[0]['index_value'] is None


def test_booking_windows_and_airline_grouping():
    p=Path(__file__).resolve().parents[1]/'DATA'/'development_observations.csv'
    df=pd.read_csv(p); rows=df.to_dict('records')
    route_windows={r['booking_window'] for r in __import__('PHASE_3.INDEX_ENGINE.route_index',fromlist=['calculate_route_indices']).calculate_route_indices(rows,'2026-09')}
    assert route_windows=={'T+1','T+7','T+15','T+30','T+45'}
    airlines=calculate_airline_indices(rows,'2026-09')
    assert {r['airline'] for r in airlines}=={'IndiGo','Air India','SpiceJet'}
    assert all(r['status']=='VALID' for r in airlines)


def test_quality_penalizes_partial_route_coverage():
    full=quality_score(18,route_coverage=1.0)
    partial=quality_score(3,route_coverage=1/6)
    assert full['quality_score']>partial['quality_score']
