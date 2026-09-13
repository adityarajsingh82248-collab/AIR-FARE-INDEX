from pathlib import Path

def test_phase3_schema_contract():
    sql=(Path(__file__).resolve().parents[1]/'DATABASE'/'phase3_migration.sql').read_text()
    for table in ('index_methodology','route_indices','overall_indices','headline_indices','airline_indices','index_quality','index_weights'):
        assert f'CREATE TABLE IF NOT EXISTS {table}' in sql
    assert 'base_period DATE NOT NULL' in sql
    assert "data_mode VARCHAR(32) NOT NULL CHECK" in sql
    assert 'fare_definition' in sql and 'cabin_scope' in sql and 'data_source_rules' in sql


def test_canonical_schema_contract_is_single_entry_point():
    compat=(Path(__file__).resolve().parents[1]/'DATABASE'/'postgresql_schema.sql').read_text()
    assert 'canonical migration entry point' in compat
    assert 'phase3_migration.sql' in compat
    assert 'CREATE TABLE' not in compat

def test_airline_upsert_uses_airline_in_unique_conflict_key():
    store=(Path(__file__).resolve().parents[1]/'API'/'store.py').read_text()
    assert 'ON CONFLICT(period,route,booking_window,airline,methodology_version)' in store
