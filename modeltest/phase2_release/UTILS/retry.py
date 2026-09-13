"""Bounded exponential backoff. No evasion behavior."""
from __future__ import annotations
import random
import time
from functools import wraps

def retry(max_attempts=3, base_delay=1.0, max_delay=30.0, retry_on=(Exception,)):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args,**kwargs):
            last=None
            for attempt in range(max_attempts):
                try:
                    return fn(*args,**kwargs)
                except retry_on as exc:
                    last=exc
                    if attempt==max_attempts-1: raise
                    delay=min(max_delay,base_delay*(2**attempt))
                    time.sleep(delay*(0.8+0.4*random.random()))
            raise last
        return wrapper
    return decorator
