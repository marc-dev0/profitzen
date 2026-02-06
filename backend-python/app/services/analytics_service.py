from ..schemas.analytics import AnalyticsRequest, AnalyticsResponse

class AnalyticsService:
    @staticmethod
    async def process_sales_analytics(request: AnalyticsRequest) -> AnalyticsResponse:
        if not request.sales_history:
            return AnalyticsResponse(
                total_sales=0,
                average_sale=0,
                max_sale=0,
                predicted_next_day_sale=0,
                growth_trend="neutral",
                message="No hay datos suficientes para el análisis"
            )

        amounts = [s.amount for s in request.sales_history]
        total = sum(amounts)
        avg = total / len(amounts)
        max_s = max(amounts)
        
        # Lógica "predictiva" simple para el ejemplo
        # Si la última venta es mayor al promedio, la tendencia es positiva
        last_sale = amounts[-1]
        trend = "up" if last_sale > avg else "down"
        prediction = last_sale * 1.05 if trend == "up" else last_sale * 0.95

        return AnalyticsResponse(
            total_sales=round(total, 2),
            average_sale=round(avg, 2),
            max_sale=round(max_s, 2),
            predicted_next_day_sale=round(prediction, 2),
            growth_trend=trend,
            message="Análisis completado exitosamente con Python FastAPI"
        )
