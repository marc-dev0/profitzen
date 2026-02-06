from fastapi import APIRouter, HTTPException
from ..schemas.analytics import AnalyticsRequest, AnalyticsResponse
from ..services.analytics_service import AnalyticsService

router = APIRouter()

@router.post("/process-sales", response_model=AnalyticsResponse, tags=["Analytics"])
async def process_sales(request: AnalyticsRequest):
    try:
        result = await AnalyticsService.process_sales_analytics(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
