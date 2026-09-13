from __future__ import annotations
from pydantic import BaseModel
from typing import Any, Optional
class IndexData(BaseModel):
    index: Optional[float]=None; base_index: float=100.0; period: Optional[str]=None; booking_window: Optional[str]=None; methodology_version: str; sample_count: int=0; quality_status: str
class ApiResponse(BaseModel):
    status: str='success'; data: Any
