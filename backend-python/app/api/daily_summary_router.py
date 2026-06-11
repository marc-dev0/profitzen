from fastapi import APIRouter, Depends, HTTPException, status

from ..core.security import verify_api_key
from ..schemas.daily_summary import DailySummaryRequest, DailySummaryResponse
from ..services.daily_summary_service import ejecutar_resumen_diario

router = APIRouter()


@router.post(
    "/resumen-diario",
    response_model=DailySummaryResponse,
    tags=["Resumen Diario"],
    summary="Genera el resumen inteligente del día para el comerciante",
    description=(
        "Recibe las ventas del día desde el backend .NET, calcula métricas clave "
        "y genera un resumen narrativo en español usando IA (Claude). "
        "Si el LLM no está disponible, devuelve las métricas calculadas sin narrativa. "
        "Requiere header `X-API-Key`."
    ),
)
async def resumen_diario(
    request: DailySummaryRequest,
    _: str = Depends(verify_api_key),
) -> DailySummaryResponse:
    try:
        return await ejecutar_resumen_diario(request)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el resumen diario: {exc}",
        )
