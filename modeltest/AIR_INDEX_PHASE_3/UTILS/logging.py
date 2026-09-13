"""Structured collection logging helpers."""
from __future__ import annotations
import csv
from pathlib import Path

FIELDS=[
    "timestamp","run_id","source","origin","destination","travel_date","booking_window",
    "status","records_collected","records_rejected","error_type","error_message","duration",
]


def append_log(path: str|Path, row: dict) -> None:
    p=Path(path); p.parent.mkdir(parents=True,exist_ok=True)
    exists=p.exists()
    with p.open("a",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=FIELDS,extrasaction="ignore")
        if not exists: w.writeheader()
        w.writerow({k:row.get(k) for k in FIELDS})
