from __future__ import annotations
from .pipeline import build_index

def load_phase2_observations(conn):
    sql="""SELECT o.observation_id,r.origin,r.destination,r.route_code,a.airline_name,o.travel_date,o.search_date,o.search_time,o.lead_time_label,o.lead_time_days,o.fare_class,o.total_fare,o.availability,s.source_name,o.collected_timestamp,o.currency,o.data_mode,o.usable_for_index,o.validation_status,o.duplicate_flag
    FROM airfare_observations o JOIN routes r ON r.route_id=o.route_id JOIN airlines a ON a.airline_id=o.airline_id JOIN sources s ON s.source_id=o.source_id
    WHERE o.usable_for_index=TRUE AND o.validation_status='VALID'"""
    with conn.cursor() as cur:
        cur.execute(sql); columns=[d.name for d in cur.description]; return [dict(zip(columns,row)) for row in cur.fetchall()]

def build_index_from_phase2(conn, root=None):
    observations=load_phase2_observations(conn)
    return build_index(observations,root)
