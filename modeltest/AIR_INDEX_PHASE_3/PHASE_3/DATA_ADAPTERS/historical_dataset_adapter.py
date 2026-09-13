from __future__ import annotations
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

COLUMN_ALIASES={"airline":"Airline","origin":"Source","destination":"Destination","travel_date":"Date_of_Journey","days_left":"Days_Left","price":"Price"}

def _parse_date(value):
    for fmt in ("%d/%m/%Y","%Y-%m-%d","%d-%m-%Y"):
        try:return datetime.strptime(str(value),fmt).date()
        except ValueError:pass
    return pd.to_datetime(value,dayfirst=True).date()

def adapt_easemytrip_csv(path, source_name="EASYMYTRIP_PUBLIC_HISTORICAL"):
    df=pd.read_csv(path)
    # Accept the common Kaggle column spelling as well as normalized names.
    cols={c.lower().replace(" ","_"):c for c in df.columns}
    def col(*names):
        for n in names:
            if n in df.columns:return n
            if n.lower().replace(" ","_") in cols:return cols[n.lower().replace(" ","_")]
        raise ValueError(f"Missing required column; tried {names}")
    airline_c=col("Airline","airline"); origin_c=col("Source","source"); dest_c=col("Destination","destination"); date_c=col("Date_of_Journey","travel_date"); days_c=col("Days Left","Days_Left","days_left"); price_c=col("Price","price")
    rows=[]
    for i,row in df.iterrows():
        travel=_parse_date(row[date_c]); days=int(row[days_c]); search=travel-timedelta(days=days); route=f"{str(row[origin_c]).upper().strip()}-{str(row[dest_c]).upper().strip()}"
        price=float(row[price_c])
        rows.append({"observation_id":f"PUBHIST_{i+1:07d}","origin":route[:3],"destination":route[-3:],"route":route,"airline":str(row[airline_c]).strip(),"travel_date":travel,"search_date":search,"search_time":None,"lead_time":f"T+{days}","lead_time_days":days,"fare_class":"Economy" if "class" not in df.columns else str(row.get("Class") or "Economy"),"base_fare":None,"taxes":None,"fees":None,"total_fare":price,"availability":"AVAILABLE","source":source_name,"timestamp":datetime.combine(search,datetime.min.time()),"currency":"INR","is_mock":False,"data_mode":"PUBLIC_HISTORICAL","environment":"DEVELOPMENT","usable_for_index":True,"validation_status":"VALID","validation_reason":"Historical adapter: source provides total fare; component breakdown unavailable.","fare_consistency_flag":"MISSING_COMPONENT","duplicate_flag":"UNIQUE","outlier_flag":"NORMAL"})
    return pd.DataFrame(rows)

def adapt_csv(path):
    return adapt_easemytrip_csv(path)
