"""Raw JSONL persistence. Raw data is append-only and preserves source payloads."""
from __future__ import annotations
from pathlib import Path
import json
from datetime import date, datetime, time


def _default(obj):
    if isinstance(obj,(date,datetime,time)): return obj.isoformat()
    raise TypeError(f"Not serializable: {type(obj)}")


def append_raw(observations: list[dict], path: str | Path) -> int:
    p=Path(path); p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("a",encoding="utf-8") as f:
        for o in observations:
            f.write(json.dumps(o,default=_default,ensure_ascii=False)+"\n")
    return len(observations)
