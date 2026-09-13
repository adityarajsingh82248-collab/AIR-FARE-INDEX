import os
import pytest
from pathlib import Path
import pandas as pd

pytestmark=pytest.mark.integration

def test_postgresql_phase3_pipeline_when_configured():
    if not os.getenv('DATABASE_URL'):
        pytest.skip('DATABASE_URL not configured; PostgreSQL integration requires an actual PostgreSQL instance')
    import psycopg
    from PHASE_3.INDEX_ENGINE.pipeline import build_index
    from PHASE_3.API.store import persist_result, get_connection, load_result
    df=pd.read_csv(Path(__file__).resolve().parents[1]/'DATA'/'development_observations.csv')
    result=build_index(df.to_dict('records'),Path(__file__).resolve().parents[1])
    conn=psycopg.connect(os.environ['DATABASE_URL'])
    with conn.cursor() as cur:
        sql=(Path(__file__).resolve().parents[1]/'DATABASE'/'phase3_migration.sql').read_text()
        for statement in [x.strip() for x in sql.split(';') if x.strip() and not x.strip().startswith('--')]: cur.execute(statement)
    conn.commit(); conn.close()
    assert persist_result(result) is True
    conn=get_connection(); stored=load_result(conn); conn.close()
    assert stored['headline_indices']
    assert stored['route_indices']
    assert stored['overall_indices']
