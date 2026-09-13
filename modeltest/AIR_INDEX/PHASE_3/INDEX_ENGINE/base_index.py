from __future__ import annotations

def base_100(current_price, base_price, base_index=100.0):
    if current_price is None or base_price is None: return None
    current=float(current_price); base=float(base_price)
    if current <= 0 or base <= 0: return None
    return (current/base)*float(base_index)
