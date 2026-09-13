from pathlib import Path
import pandas as pd

def test_bundled_development_data_is_not_live_or_historical():
    p=Path(__file__).resolve().parents[1]/'DATA'/'development_observations.csv'
    d=pd.read_csv(p)
    assert set(d['data_mode'])=={'DEVELOPMENT_SYNTHETIC'}
    assert bool(d['is_mock'].all()) is True

def test_required_route_and_window_configuration_is_consistent():
    import yaml
    root=Path(__file__).resolve().parents[1]
    cfg=yaml.safe_load((root/'CONFIG'/'index_config.yaml').read_text())
    weights=yaml.safe_load((root/'CONFIG'/'weights.yaml').read_text())
    routes=yaml.safe_load((root.parent/'CONFIG'/'routes.yaml').read_text())['routes']
    expected={f"{r['origin']}-{r['destination']}" for r in routes}
    assert set(cfg['routes'])==expected
    assert set(cfg['routes'])==set(weights['weights'])
    assert cfg['booking_windows']==['T+1','T+7','T+15','T+30','T+45']
