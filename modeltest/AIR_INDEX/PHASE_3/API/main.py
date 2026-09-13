from __future__ import annotations
from pathlib import Path
import sys, os, json, pandas as pd
from fastapi import FastAPI, HTTPException, Query
from .schemas import ApiResponse
from .store import get_connection, load_result
from PHASE_3.INDEX_ENGINE.pipeline import build_index

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
VALID_ROUTES={'DEL-BOM','DEL-BLR','BOM-BLR','DEL-CCU','BLR-HYD','MAA-DEL'}
VALID_WINDOWS={'T+1','T+7','T+15','T+30','T+45'}
PRODUCTION_MODES={'LIVE_API','LIVE_NDC','AUTHORIZED_SCRAPE'}

def _is_production():
    return os.getenv('APP_ENV','DEVELOPMENT').upper() == 'PRODUCTION'
app=FastAPI(title='AIR-INDEX API',version='2.0.0',description='AIR-INDEX calculation, PostgreSQL persistence, ML forecasting, anomaly detection and API layer (Phases 1-4 integrated).')

def _compute_development():
    p=ROOT/'PHASE_3'/'DATA'/'development_observations.csv'
    if not p.exists(): return {'route_indices':[],'overall_indices':[],'headline_indices':[],'airline_indices':[],'methodology':{}}
    df=pd.read_csv(p)
    for c in ['travel_date','search_date','timestamp']:
        if c in df.columns: df[c]=pd.to_datetime(df[c])
    return build_index(df.to_dict('records'),ROOT/'PHASE_3')

def _result(**filters):
    if _is_production() and not os.getenv('DATABASE_URL'):
        raise HTTPException(503,detail='PostgreSQL is required in PRODUCTION; development/fixture data is not permitted')
    if os.getenv('DATABASE_URL'):
        try:
            conn=get_connection()
            result=load_result(conn,allowed_data_modes=PRODUCTION_MODES if _is_production() else None,**filters); conn.close(); return result
        except Exception as exc:
            raise HTTPException(503,detail=f'PostgreSQL unavailable: {exc.__class__.__name__}')
    result=_compute_development()
    if filters.get('booking_window'):
        result['overall_indices']=[r for r in result['overall_indices'] if r.get('booking_window')==filters['booking_window']]
        result['route_indices']=[r for r in result['route_indices'] if r.get('booking_window')==filters['booking_window']]
        result['airline_indices']=[r for r in result['airline_indices'] if r.get('booking_window')==filters['booking_window']]
    if filters.get('route'):
        result['route_indices']=[r for r in result['route_indices'] if r.get('route')==filters['route']]
        result['airline_indices']=[r for r in result['airline_indices'] if r.get('route')==filters['route']]
    if filters.get('airline'):
        result['airline_indices']=[r for r in result['airline_indices'] if r.get('airline')==filters['airline']]
    for key in ('start_date','end_date'):
        value=filters.get(key)
        if value:
            result['overall_indices']=[r for r in result['overall_indices'] if (str(r['period']) >= value if key=='start_date' else str(r['period']) <= value)]
            result['headline_indices']=[r for r in result['headline_indices'] if (str(r['period']) >= value if key=='start_date' else str(r['period']) <= value)]
    return result

def _validate_window(value):
    if value is not None and value not in VALID_WINDOWS: raise HTTPException(422,detail=f'booking_window must be one of {sorted(VALID_WINDOWS)}')
def _validate_route(value):
    if value is not None and value.upper() not in VALID_ROUTES: raise HTTPException(422,detail=f'route must be one of {sorted(VALID_ROUTES)}')
def _validate_date(value,name):
    if value is not None:
        try: pd.Timestamp(value)
        except Exception: raise HTTPException(422,detail=f'{name} must be a valid ISO date')

# ── Phase 3 Endpoints (preserved exactly) ──────────────────────────────────

@app.get('/api/v1/health')
def health():
    if not os.getenv('DATABASE_URL'):
        if _is_production():
            raise HTTPException(503,detail='PostgreSQL is required in PRODUCTION')
        return {'status':'success','data':{'api':'healthy','database':'not_configured','data_source':'DEVELOPMENT_SYNTHETIC'}}
    try:
        c=get_connection(); c.execute('SELECT 1'); c.close(); return {'status':'success','data':{'api':'healthy','database':'healthy','data_source':'POSTGRESQL'}}
    except Exception: return {'status':'error','data':{'api':'healthy','database':'unavailable'}}

@app.get('/api/v1/index/latest',response_model=ApiResponse)
def latest():
    result=_result(); rows=result.get('headline_indices',[])
    if not rows: raise HTTPException(404,'No calculated headline AIR-INDEX is available')
    row=rows[-1]
    return {'status':'success','data':{'index':row['index_value'],'base_index':100.0,'period':str(row['period']),'booking_window':'ALL','methodology_version':row['methodology_version'],'sample_count':row['sample_count'],'route_coverage':row.get('route_coverage'),'quality_score':row.get('quality_score'),'quality_status':row['quality_status'],'data_mode':row.get('data_mode')}}

@app.get('/api/v1/index/history',response_model=ApiResponse)
def history(start_date: str|None=None,end_date: str|None=None,booking_window: str|None=None):
    _validate_window(booking_window); _validate_date(start_date,'start_date'); _validate_date(end_date,'end_date')
    if start_date and end_date and pd.Timestamp(start_date)>pd.Timestamp(end_date): raise HTTPException(422,'start_date must be <= end_date')
    return {'status':'success','data':_result(start_date=start_date,end_date=end_date,booking_window=booking_window)['overall_indices']}

@app.get('/api/v1/index/routes',response_model=ApiResponse)
def routes(booking_window: str|None=None):
    _validate_window(booking_window); rows=_result(booking_window=booking_window)['route_indices']; return {'status':'success','data':rows}

@app.get('/api/v1/index/routes/{route}',response_model=ApiResponse)
def route(route: str,booking_window: str|None=None):
    route=route.upper(); _validate_route(route); _validate_window(booking_window)
    rows=[r for r in _result(route=route,booking_window=booking_window)['route_indices'] if r['route']==route and (booking_window is None or r['booking_window']==booking_window)]
    if not rows: raise HTTPException(404,'No index data for route')
    return {'status':'success','data':rows}

@app.get('/api/v1/index/booking-windows',response_model=ApiResponse)
def booking_windows(): return {'status':'success','data':_result()['overall_indices']}

@app.get('/api/v1/index/airlines',response_model=ApiResponse)
def airlines(route: str|None=None,airline: str|None=None,booking_window: str|None=None):
    _validate_route(route); _validate_window(booking_window)
    rows=_result(route=route.upper() if route else None,airline=airline,booking_window=booking_window)['airline_indices']
    if booking_window: rows=[r for r in rows if r['booking_window']==booking_window]
    return {'status':'success','data':rows}

@app.get('/api/v1/observations/latest',response_model=ApiResponse)
def observations_latest():
    if os.getenv('DATABASE_URL'):
        try:
            c=get_connection()
            with c.cursor() as cur:
                if _is_production():
                    cur.execute("SELECT observation_id,travel_date,search_date,lead_time_label,route_id,airline_id,source_id,total_fare,currency,usable_for_index,validation_status,data_mode FROM airfare_observations WHERE data_mode = ANY(%s) ORDER BY collected_timestamp DESC LIMIT 50", (list(PRODUCTION_MODES),))
                else:
                    cur.execute("SELECT observation_id,travel_date,search_date,lead_time_label,route_id,airline_id,source_id,total_fare,currency,usable_for_index,validation_status,data_mode FROM airfare_observations ORDER BY collected_timestamp DESC LIMIT 50")
                rows=[dict(r) for r in cur.fetchall()]
            c.close(); return {'status':'success','data':rows}
        except Exception as exc: raise HTTPException(503,detail=f'PostgreSQL unavailable: {exc.__class__.__name__}')
    p=ROOT/'PHASE_3'/'DATA'/'development_observations.csv'
    if not p.exists(): return {'status':'success','data':[]}
    df=pd.read_csv(p).tail(50); return {'status':'success','data':df.where(pd.notnull(df),None).to_dict('records')}

@app.get('/api/v1/data-quality',response_model=ApiResponse)
def data_quality():
    rows=_result()['route_indices']; keys=('period','route','booking_window','sample_count','outlier_count','quality_score','quality_status','data_mode')
    return {'status':'success','data':[{k:r[k] for k in keys} for r in rows]}

# ── Phase 4 Endpoints (new, additive) ──────────────────────────────────────

def _get_forecast_data():
    """Load forecast results from saved training report or model artifacts."""
    report_path = ROOT / 'phase4' / 'models' / 'training_report.json'
    if report_path.exists():
        with open(report_path) as f:
            return json.load(f)
    return None

def _get_model_info():
    """Load latest model metadata."""
    models_dir = ROOT / 'phase4' / 'models'
    if not models_dir.exists():
        return None
    meta_files = sorted(models_dir.glob('*_metadata.json'), reverse=True)
    if not meta_files:
        return None
    with open(meta_files[0]) as f:
        return json.load(f)

@app.get('/api/v1/forecast/latest', response_model=ApiResponse)
def forecast_latest():
    """Latest forecast from Phase 4 ML pipeline."""
    try:
        result = _result()
        headline = result.get('headline_indices', [])
        if not headline:
            raise HTTPException(404, 'No index data available for forecasting')
        from phase4.features.feature_pipeline import build_feature_dataset
        from phase4.inference.predict import predict_forecast, find_latest_model
        features_df = build_feature_dataset(headline)
        model_path, meta = find_latest_model()
        if model_path is None:
            # Fall back to baseline prediction
            from phase4.forecasting.baselines import NaiveBaseline
            import numpy as np
            values = [h['index_value'] for h in headline if h.get('index_value') is not None]
            if not values:
                raise HTTPException(404, 'No index values available')
            baseline = NaiveBaseline()
            baseline.fit(np.array(values))
            pred = baseline.predict(1)
            return {'status': 'success', 'data': {
                'forecast': float(pred[0]),
                'model': 'naive_previous_value (no trained ML model available)',
                'horizon': 'next_period_monthly',
                'data_mode': headline[-1].get('data_mode', 'DEVELOPMENT_SYNTHETIC'),
                'methodology_version': headline[-1].get('methodology_version', 'AIR_INDEX_V1'),
            }}
        forecast = predict_forecast(features_df, model_path, meta)
        return {'status': 'success', 'data': forecast}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, detail=f'Forecast unavailable: {exc.__class__.__name__}: {exc}')

@app.get('/api/v1/forecast/history', response_model=ApiResponse)
def forecast_history():
    """Historical forecast results."""
    report = _get_forecast_data()
    if report is None:
        raise HTTPException(404, 'No forecast history available. Run training first.')
    return {'status': 'success', 'data': {
        'status': report.get('status'),
        'data_mode': report.get('data_mode', 'DEVELOPMENT_SYNTHETIC'),
        'granularity': report.get('granularity', 'monthly'),
        'metrics': report.get('all_metrics', []),
        'model_comparison': report.get('model_comparison', {}),
    }}

@app.get('/api/v1/forecast/{horizon}', response_model=ApiResponse)
def forecast_horizon(horizon: int):
    """Forecast for a specific horizon (in months)."""
    if horizon < 1 or horizon > 12:
        raise HTTPException(422, 'Horizon must be between 1 and 12 months')
    try:
        result = _result()
        headline = result.get('headline_indices', [])
        if not headline:
            raise HTTPException(404, 'No index data available')
        import numpy as np
        from phase4.forecasting.baselines import NaiveBaseline
        values = [h['index_value'] for h in headline if h.get('index_value') is not None]
        if not values:
            raise HTTPException(404, 'No index values available')
        baseline = NaiveBaseline()
        baseline.fit(np.array(values))
        preds = baseline.predict(horizon)
        forecasts = []
        for i, p in enumerate(preds):
            forecasts.append({'horizon_month': i + 1, 'predicted_value': float(p)})
        return {'status': 'success', 'data': {
            'forecasts': forecasts,
            'model': 'naive_previous_value',
            'data_mode': headline[-1].get('data_mode', 'DEVELOPMENT_SYNTHETIC'),
        }}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, detail=f'Forecast error: {exc}')

@app.get('/api/v1/anomalies', response_model=ApiResponse)
def anomalies_all():
    """All detected anomalies from Phase 4 anomaly detection."""
    try:
        result = _result()
        headline = result.get('headline_indices', [])
        route_idx = result.get('route_indices', [])
        from phase4.anomaly_detection.detector import detect_all_anomalies
        detected = detect_all_anomalies(headline, route_idx)
        return {'status': 'success', 'data': {
            'anomalies': detected,
            'count': len(detected),
            'data_mode': headline[0].get('data_mode', 'DEVELOPMENT_SYNTHETIC') if headline else 'UNKNOWN',
        }}
    except Exception as exc:
        raise HTTPException(503, detail=f'Anomaly detection error: {exc}')

@app.get('/api/v1/anomalies/latest', response_model=ApiResponse)
def anomalies_latest():
    """Latest detected anomalies (most recent period only)."""
    try:
        result = _result()
        headline = result.get('headline_indices', [])
        route_idx = result.get('route_indices', [])
        from phase4.anomaly_detection.detector import detect_all_anomalies
        detected = detect_all_anomalies(headline, route_idx)
        if not detected:
            return {'status': 'success', 'data': {'anomalies': [], 'count': 0}}
        # Get most recent period
        periods = sorted(set(a.get('period', '') for a in detected if a.get('period')), reverse=True)
        latest_period = periods[0] if periods else None
        latest = [a for a in detected if a.get('period') == latest_period] if latest_period else detected[:10]
        return {'status': 'success', 'data': {
            'anomalies': latest,
            'count': len(latest),
            'period': latest_period,
        }}
    except Exception as exc:
        raise HTTPException(503, detail=f'Anomaly detection error: {exc}')

@app.get('/api/v1/models', response_model=ApiResponse)
def models():
    """List available ML models from Phase 4."""
    meta = _get_model_info()
    if meta is None:
        return {'status': 'success', 'data': {'models': [], 'message': 'No trained models. Run phase4.training.train_forecast first.'}}
    return {'status': 'success', 'data': {'models': [meta]}}

@app.get('/api/v1/model-performance', response_model=ApiResponse)
def model_performance():
    """Model performance metrics from Phase 4 training."""
    report = _get_forecast_data()
    if report is None:
        raise HTTPException(404, 'No model performance data available. Run training first.')
    return {'status': 'success', 'data': {
        'metrics': report.get('all_metrics', []),
        'model_comparison': report.get('model_comparison', {}),
        'data_volume_warning': report.get('data_volume_warning'),
        'data_mode': report.get('data_mode', 'DEVELOPMENT_SYNTHETIC'),
    }}
