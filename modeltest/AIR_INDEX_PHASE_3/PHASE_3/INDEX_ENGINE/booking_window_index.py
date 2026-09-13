from __future__ import annotations
def group_by_booking_window(route_rows):
    out={}
    for row in route_rows: out.setdefault(row["booking_window"],[]).append(row)
    return out
