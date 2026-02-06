from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SaleDataPoint(BaseModel):
    date: datetime
    amount: float

class AnalyticsRequest(BaseModel):
    sales_history: List[SaleDataPoint]
    forecast_days: int = 7

class AnalyticsResponse(BaseModel):
    total_sales: float
    average_sale: float
    max_sale: float
    predicted_next_day_sale: float
    growth_trend: str
    message: str
