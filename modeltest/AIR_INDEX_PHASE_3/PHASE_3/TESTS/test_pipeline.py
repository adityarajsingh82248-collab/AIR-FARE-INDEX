from pathlib import Path
import pandas as pd
from PHASE_3.INDEX_ENGINE.pipeline import build_index

def test_pipeline_builds_complete_development_fixture():
    p=Path(__file__).resolve().parents[1]/'DATA'/'development_observations.csv'
    df=pd.read_csv(p)
    assert len(df)==540
    assert set(df.route)=={'DEL-BOM','DEL-BLR','BOM-BLR','DEL-CCU','BLR-HYD','MAA-DEL'}
    assert set(df.lead_time)=={'T+1','T+7','T+15','T+30','T+45'}
    assert set(df.data_mode)=={'DEVELOPMENT_SYNTHETIC'}
    result=build_index(df.to_dict('records'),Path(__file__).resolve().parents[1])
    assert result['methodology']['methodology_version']=='AIR_INDEX_V1'
    assert len(result['route_indices'])==60
    assert len(result['overall_indices'])==10
    assert len(result['headline_indices'])==2
    assert len(result['airline_indices'])==180
    assert result['headline_indices'][-1]['booking_window']=='ALL'
    assert result['headline_indices'][-1]['index_value']>100
