"""Calculate Phase 3 from validated Phase 2 PostgreSQL observations and persist results."""
from __future__ import annotations
import os
from pathlib import Path
from PHASE_3.API.store import get_connection, persist_result
from PHASE_3.INDEX_ENGINE.phase2_db_adapter import build_index_from_phase2

def main():
    if not os.getenv('DATABASE_URL'):
        raise SystemExit('DATABASE_URL is required; Phase 3 production calculation does not fall back to CSV')
    conn=get_connection()
    try:
        result=build_index_from_phase2(conn,Path(__file__).resolve().parent)
    finally:
        conn.close()
    if not result['route_indices']:
        raise SystemExit('No validated Phase 2 observations are available for Phase 3 calculation')
    persist_result(result)
    print(f"Persisted {len(result['route_indices'])} route-index rows and {len(result['headline_indices'])} headline rows")

if __name__=='__main__': main()
