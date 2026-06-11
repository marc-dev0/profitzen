from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import date


class ItemVenta(BaseModel):
    nombre: str
    cantidad: int = Field(ge=1)
    precio_unitario: float = Field(ge=0)


class VentaDiaria(BaseModel):
    id: Optional[str] = None
    hora: str = Field(..., description="Hora de la venta en formato HH:MM")
    monto_total: float = Field(ge=0)
    metodo_pago: str = Field(..., description="efectivo | tarjeta | yape | plin | otro")
    items: List[ItemVenta] = []


class DailySummaryRequest(BaseModel):
    fecha: date
    ventas: List[VentaDiaria]
    venta_dia_anterior: Optional[float] = Field(None, ge=0, description="Total del día anterior para comparar")
    meta_diaria: Optional[float] = Field(None, ge=0, description="Meta de ventas del día")


class DailySummaryResponse(BaseModel):
    fecha: str
    total_ventas: float
    numero_transacciones: int
    ticket_promedio: float
    hora_pico: Optional[str] = None
    producto_estrella: Optional[str] = None
    comparacion_ayer_pct: Optional[float] = Field(
        None, description="Variación vs día anterior en %. Positivo = creció, negativo = bajó"
    )
    porcentaje_meta: Optional[float] = Field(
        None, description="Porcentaje de la meta diaria alcanzado"
    )
    metodos_pago: Dict[str, float] = Field(
        default_factory=dict,
        description="Monto recaudado por método de pago (S/)",
    )
    resumen_narrativo: Optional[str] = Field(
        None, description="Resumen en lenguaje natural generado por IA"
    )
    llm_disponible: bool = Field(
        description="True si el resumen narrativo fue generado por IA, False si hubo error"
    )
