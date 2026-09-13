from __future__ import annotations
from datetime import date
import json, os

VALID_DATA_MODES={"FIXTURE","PUBLIC_HISTORICAL","DEVELOPMENT_SYNTHETIC","API_TEST","LIVE_API","LIVE_NDC","AUTHORIZED_SCRAPE","MIXED"}
PRODUCTION_DATA_MODES={"LIVE_API","LIVE_NDC","AUTHORIZED_SCRAPE"}

def get_connection():
    url=os.getenv("DATABASE_URL")
    if not url: return None
    import psycopg
    return psycopg.connect(url)

def _period(value):
    if isinstance(value,date): return value
    text=str(value)
    return date.fromisoformat(text[:7]+"-01") if len(text)>=7 else date.fromisoformat(text)

def persist_result(result):
    conn=get_connection()
    if conn is None: return False
    meta=result["methodology"]
    with conn.transaction(), conn.cursor() as cur:
        cur.execute("""INSERT INTO index_methodology(methodology_version,base_period,base_index,representative_method,weighting_method,route_list,booking_windows,outlier_method,quality_thresholds,fare_definition,cabin_scope,data_source_rules,data_mode)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(methodology_version) DO UPDATE SET base_period=EXCLUDED.base_period,base_index=EXCLUDED.base_index,representative_method=EXCLUDED.representative_method,weighting_method=EXCLUDED.weighting_method,route_list=EXCLUDED.route_list,booking_windows=EXCLUDED.booking_windows,outlier_method=EXCLUDED.outlier_method,quality_thresholds=EXCLUDED.quality_thresholds,fare_definition=EXCLUDED.fare_definition,cabin_scope=EXCLUDED.cabin_scope,data_source_rules=EXCLUDED.data_source_rules,data_mode=EXCLUDED.data_mode""",
        (meta["methodology_version"],_period(meta["base_period"]),meta["base_index"],meta["representative_price_method"],meta["weight_method"],json.dumps(meta["routes"]),json.dumps(meta["booking_windows"]),meta["outlier_method"],json.dumps(meta["quality_thresholds"]),meta["fare_definition"],meta["cabin"],json.dumps(meta.get("data_source_rules",{})),meta.get("data_mode","DEVELOPMENT_SYNTHETIC")))
        for route,w in meta["weights"].items():
            cur.execute("""INSERT INTO index_weights(methodology_version,route,weight,source_status,source_reference) VALUES(%s,%s,%s,%s,%s) ON CONFLICT(methodology_version,route) DO UPDATE SET weight=EXCLUDED.weight,source_status=EXCLUDED.source_status,source_reference=EXCLUDED.source_reference""",(meta["methodology_version"],route,w,meta.get("weight_source_status","DEVELOPMENT_PROTOTYPE"),"Configuration; not official government weights"))
        for r in result["route_indices"]:
            cur.execute("""INSERT INTO route_indices(period,route,booking_window,representative_price,base_price,index_value,sample_count,weight,quality_score,quality_status,data_mode,methodology_version) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(period,route,booking_window,methodology_version) DO UPDATE SET representative_price=EXCLUDED.representative_price,base_price=EXCLUDED.base_price,index_value=EXCLUDED.index_value,sample_count=EXCLUDED.sample_count,weight=EXCLUDED.weight,quality_score=EXCLUDED.quality_score,quality_status=EXCLUDED.quality_status,data_mode=EXCLUDED.data_mode""",(_period(r["period"]),r["route"],r["booking_window"],r["representative_price"],r["base_price"],r["index_value"],r["sample_count"],r["weight"],r["quality_score"],r["quality_status"],r["data_mode"],r["methodology_version"]))
        for r in result["overall_indices"]:
            cur.execute("""INSERT INTO overall_indices(period,booking_window,index_value,sample_count,quality_score,quality_status,data_mode,methodology_version) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(period,booking_window,methodology_version) DO UPDATE SET index_value=EXCLUDED.index_value,sample_count=EXCLUDED.sample_count,quality_score=EXCLUDED.quality_score,quality_status=EXCLUDED.quality_status,data_mode=EXCLUDED.data_mode""",(_period(r["period"]),r["booking_window"],r["index_value"],r["sample_count"],r["quality_score"],r["quality_status"],r["data_mode"],r["methodology_version"]))
        for r in result.get("headline_indices",[]):
            cur.execute("""INSERT INTO headline_indices(period,index_value,sample_count,route_coverage,quality_score,quality_status,data_mode,methodology_version) VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(period,methodology_version) DO UPDATE SET index_value=EXCLUDED.index_value,sample_count=EXCLUDED.sample_count,route_coverage=EXCLUDED.route_coverage,quality_score=EXCLUDED.quality_score,quality_status=EXCLUDED.quality_status,data_mode=EXCLUDED.data_mode""",(_period(r["period"]),r["index_value"],r["sample_count"],r["route_coverage"],r["quality_score"],r["quality_status"],r["data_mode"],r["methodology_version"]))
        for r in result.get("route_indices",[]):
            cur.execute("""INSERT INTO index_quality(period,route,booking_window,sample_count,missing_rate,duplicate_rate,outlier_rate,source_count,airline_count,quality_score,quality_status,methodology_version,data_mode) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",(_period(r["period"]),r["route"],r["booking_window"],r["sample_count"],0.0,0.0,r.get("outlier_count",0)/max(r.get("sample_count",1),1),0,0,r["quality_score"],r["quality_status"],r["methodology_version"],r.get("data_mode","UNKNOWN")))
        for r in result.get("airline_indices",[]):
            mode=r.get("data_mode") or result.get("methodology",{}).get("data_mode") or "UNKNOWN"
            cur.execute("""INSERT INTO airline_indices(period,route,booking_window,airline,representative_price,base_price,index_value,sample_count,status,methodology_version,data_mode) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(period,route,booking_window,airline,methodology_version) DO UPDATE SET representative_price=EXCLUDED.representative_price,base_price=EXCLUDED.base_price,index_value=EXCLUDED.index_value,sample_count=EXCLUDED.sample_count,status=EXCLUDED.status,data_mode=EXCLUDED.data_mode""",(_period(r["period"]),r["route"],r["booking_window"],r["airline"],r["representative_price"],r["base_price"],r["index_value"],r["sample_count"],r["status"],r["methodology_version"],mode))
    conn.close()
    return True

def _rows(cur, sql, params=()):
    cur.execute(sql,params); return [dict(r) for r in cur.fetchall()]

def load_result(conn, start_date=None, end_date=None, booking_window=None, route=None, airline=None, allowed_data_modes=None):
    # DB is the production source whenever DATABASE_URL is configured.
    # allowed_data_modes is used by the production API to fail closed on fixture/demo rows.
    result={"route_indices":[],"overall_indices":[],"headline_indices":[],"airline_indices":[],"methodology":{}}
    with conn.cursor() as cur:
        params=[]; where=[]
        if allowed_data_modes is not None:
            where.append("data_mode = ANY(%s)"); params.append(list(allowed_data_modes))
        if start_date: where.append("period >= %s"); params.append(_period(start_date))
        if end_date: where.append("period <= %s"); params.append(_period(end_date))
        if booking_window: where.append("booking_window = %s"); params.append(booking_window)
        if route: where.append("route = %s"); params.append(route)
        sql="SELECT period,route,booking_window,representative_price,base_price,index_value,sample_count,weight,quality_score,quality_status,data_mode,methodology_version FROM route_indices"
        if where: sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY period,route,booking_window"
        result["route_indices"]=_rows(cur,sql,params)
        params=[]; where=[]
        if allowed_data_modes is not None:
            where.append("data_mode = ANY(%s)"); params.append(list(allowed_data_modes))
        if start_date: where.append("period >= %s"); params.append(_period(start_date))
        if end_date: where.append("period <= %s"); params.append(_period(end_date))
        if booking_window: where.append("booking_window = %s"); params.append(booking_window)
        sql="SELECT period,booking_window,index_value,sample_count,quality_score,quality_status,data_mode,methodology_version FROM overall_indices"
        if where: sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY period,booking_window"
        result["overall_indices"]=_rows(cur,sql,params)
        params=[]; where=[]
        if allowed_data_modes is not None:
            where.append("data_mode = ANY(%s)"); params.append(list(allowed_data_modes))
        if start_date: where.append("period >= %s"); params.append(_period(start_date))
        if end_date: where.append("period <= %s"); params.append(_period(end_date))
        sql="SELECT period,index_value,sample_count,route_coverage,quality_score,quality_status,data_mode,methodology_version FROM headline_indices"
        if where: sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY period"
        result["headline_indices"]=_rows(cur,sql,params)
        params=[]; where=[]
        if allowed_data_modes is not None:
            where.append("data_mode = ANY(%s)"); params.append(list(allowed_data_modes))
        if start_date: where.append("period >= %s"); params.append(_period(start_date))
        if end_date: where.append("period <= %s"); params.append(_period(end_date))
        if route: where.append("route = %s"); params.append(route)
        if airline: where.append("airline = %s"); params.append(airline)
        sql="SELECT period,route,booking_window,airline,representative_price,base_price,index_value,sample_count,status,methodology_version,data_mode FROM airline_indices"
        if where: sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY period,route,booking_window,airline"
        result["airline_indices"]=_rows(cur,sql,params)
        if allowed_data_modes is not None:
            m=_rows(cur,"SELECT methodology_version,base_period,base_index,representative_method,weighting_method,route_list,booking_windows,outlier_method,quality_thresholds,fare_definition,cabin_scope,data_source_rules,data_mode FROM index_methodology WHERE data_mode = ANY(%s) ORDER BY created_at DESC LIMIT 1", (list(allowed_data_modes),))
        else:
            m=_rows(cur,"SELECT methodology_version,base_period,base_index,representative_method,weighting_method,route_list,booking_windows,outlier_method,quality_thresholds,fare_definition,cabin_scope,data_source_rules,data_mode FROM index_methodology ORDER BY created_at DESC LIMIT 1")
        if m: result["methodology"]=m[0]
    return result
