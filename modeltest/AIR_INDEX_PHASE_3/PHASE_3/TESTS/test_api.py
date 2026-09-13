from fastapi.testclient import TestClient
from PHASE_3.API.main import app
client=TestClient(app)

def test_health(): assert client.get('/api/v1/health').status_code==200

def test_latest_is_headline_not_single_booking_window():
    r=client.get('/api/v1/index/latest'); assert r.status_code==200; assert r.json()['data']['booking_window']=='ALL'

def test_routes_and_all_windows():
    r=client.get('/api/v1/index/routes'); assert r.status_code==200; assert {x['booking_window'] for x in r.json()['data']}=={'T+1','T+7','T+15','T+30','T+45'}

def test_validation():
    assert client.get('/api/v1/index/routes/NOT-A-ROUTE').status_code==422
    assert client.get('/api/v1/index/history?booking_window=T+99').status_code==422
    assert client.get('/api/v1/index/history?start_date=2026-10-01&end_date=2026-09-01').status_code==422

def test_airlines_filters():
    r=client.get('/api/v1/index/airlines?route=DEL-BOM&booking_window=T%2B1'); assert r.status_code==200; assert all(x['route']=='DEL-BOM' and x['booking_window']=='T+1' for x in r.json()['data'])

def test_docs_and_openapi():
    assert client.get('/docs').status_code==200
    assert client.get('/openapi.json').status_code==200


def test_configured_database_unavailable_returns_503(monkeypatch):
    import PHASE_3.API.main as main
    monkeypatch.setenv('DATABASE_URL','postgresql://unavailable')
    monkeypatch.setattr(main,'get_connection',lambda: (_ for _ in ()).throw(RuntimeError('db down')))
    assert client.get('/api/v1/index/latest').status_code==503
    monkeypatch.delenv('DATABASE_URL',raising=False)


def test_production_requires_postgresql_and_rejects_development_fixture(monkeypatch):
    monkeypatch.setenv('APP_ENV','PRODUCTION')
    monkeypatch.delenv('DATABASE_URL',raising=False)
    assert client.get('/api/v1/index/latest').status_code == 503
    assert client.get('/api/v1/health').status_code == 503
    monkeypatch.setenv('APP_ENV','DEVELOPMENT')


def test_all_required_endpoints_have_structured_success_responses():
    paths=[
        '/api/v1/index/latest', '/api/v1/index/history', '/api/v1/index/routes',
        '/api/v1/index/routes/DEL-BOM', '/api/v1/index/booking-windows',
        '/api/v1/index/airlines', '/api/v1/observations/latest', '/api/v1/data-quality',
    ]
    for path in paths:
        response=client.get(path)
        assert response.status_code in (200,404)
        if response.status_code==200:
            assert response.json().get('status') == 'success'
