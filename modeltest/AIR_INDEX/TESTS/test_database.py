from pathlib import Path
from PIPELINE.database_loader import load_batch


def test_schema_has_collection_metadata_and_lineage():
    root=Path.cwd()
    sql=(root/"DATABASE/postgresql_schema.sql").read_text()
    assert "collection_runs" in sql
    assert "collection_logs" in sql
    assert "collection_run_id" in sql
    assert "records_attempted" in sql
    assert "SOLD_OUT','MISSING','UNKNOWN" in sql


class FakeCursor:
    def __init__(self):
        self.statements=[]
        self.rowcount=1
    def __enter__(self): return self
    def __exit__(self,*args): return False
    def execute(self, sql, params=None):
        self.statements.append((sql,params))
    def fetchone(self): return (1,)


class FakeTransaction:
    """Mimics psycopg3's conn.transaction(): scopes a transaction only and never
    closes the connection -- unlike a bare `with conn:`, which psycopg3 closes
    on block exit for any non-pooled connection. load_batch/start_run/finish_run/
    initialize_database all reuse one caller-owned connection across several
    calls, so accidentally closing it here previously broke every call after
    the first (see PIPELINE.database_loader module docstring)."""
    def __init__(self, conn):
        self.conn = conn
    def __enter__(self): return self
    def __exit__(self, exc_type, exc, tb):
        if exc_type is not None:
            self.conn.rollback()
        return False


class FakeConn:
    def __init__(self):
        self.cur=FakeCursor(); self.rollback_called=False; self.closed=False
    def __enter__(self): return self
    def __exit__(self,*args): return False
    def cursor(self): return self.cur
    def rollback(self): self.rollback_called=True
    def transaction(self): return FakeTransaction(self)
    def close(self): self.closed=True


def test_load_batch_uses_transaction_and_master_upserts():
    conn=FakeConn()
    row={"observation_id":"X","origin":"DEL","destination":"BOM","route":"DEL-BOM","airline":"IndiGo","travel_date":"2026-09-15","search_date":"2026-09-08","search_time":"10:00:00","lead_time":"T+7","lead_time_days":7,"fare_class":"Economy","base_fare":5000,"taxes":500,"fees":50,"total_fare":5550,"availability":"AVAILABLE","usable_for_index":True,"fare_consistency_flag":"VALID","validation_status":"VALID","validation_reason":None,"duplicate_flag":"UNIQUE","outlier_flag":"NORMAL","timestamp":"2026-09-08T10:00:00","collection_run_id":"RUN_X"}
    assert load_batch(conn,[row],"RUN_X","TEST",__import__('datetime').datetime(2026,9,8,10)) == 1
    assert any("INSERT INTO routes" in s[0] for s in conn.cur.statements)
    assert any("INSERT INTO airfare_observations" in s[0] for s in conn.cur.statements)
    assert conn.closed is False  # load_batch must never close a connection it doesn't own

class FailingCursor(FakeCursor):
    def __init__(self):
        super().__init__(); self.calls=0
    def execute(self, sql, params=None):
        self.calls += 1
        if self.calls >= 2:
            raise RuntimeError("simulated database failure")
        super().execute(sql, params)


class FailingConn(FakeConn):
    def __init__(self):
        super().__init__(); self.cur=FailingCursor()


def test_load_batch_rolls_back_on_failure():
    conn=FailingConn()
    row={"observation_id":"X","origin":"DEL","destination":"BOM","route":"DEL-BOM","airline":"IndiGo","travel_date":"2026-09-15","search_date":"2026-09-08","search_time":"10:00:00","lead_time":"T+7","lead_time_days":7,"fare_class":"Economy","base_fare":5000,"taxes":500,"fees":50,"total_fare":5550,"availability":"AVAILABLE","usable_for_index":True,"fare_consistency_flag":"VALID","validation_status":"VALID","validation_reason":None,"duplicate_flag":"UNIQUE","outlier_flag":"NORMAL","timestamp":"2026-09-08T10:00:00","collection_run_id":"RUN_X"}
    try:
        load_batch(conn,[row],"RUN_X","TEST",__import__('datetime').datetime(2026,9,8,10))
    except RuntimeError as exc:
        assert "simulated database failure" in str(exc)
    else:
        raise AssertionError("Expected simulated DB failure")
    assert conn.rollback_called is True
    assert conn.closed is False  # a failed batch must still allow finish_run() on the same connection
