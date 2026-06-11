"""
Servicio de resumen diario implementado con LangGraph.

Grafo de 2 nodos:
  calcular_metricas  →  generar_narrativa_llm  →  END

Si el LLM falla, el grafo devuelve las métricas calculadas sin narrativa.
"""

import logging
import os
from typing import Any, Dict, List, Optional

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from ..schemas.daily_summary import DailySummaryRequest, DailySummaryResponse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Estado del grafo
# ---------------------------------------------------------------------------

class SummaryState(TypedDict):
    fecha: str
    ventas: List[Dict[str, Any]]
    venta_dia_anterior: Optional[float]
    meta_diaria: Optional[float]
    # Resultados de cada nodo
    metricas: Dict[str, Any]
    resumen_narrativo: Optional[str]
    error_llm: Optional[str]


# ---------------------------------------------------------------------------
# Nodo 1 – cálculo de métricas (síncrono, sin I/O)
# ---------------------------------------------------------------------------

def _calcular_metricas(state: SummaryState) -> Dict[str, Any]:
    ventas = state["ventas"]

    if not ventas:
        return {
            "metricas": {
                "total_ventas": 0.0,
                "numero_transacciones": 0,
                "ticket_promedio": 0.0,
                "hora_pico": None,
                "producto_estrella": None,
                "metodos_pago": {},
                "metodo_pago_principal": None,
                "comparacion_ayer_pct": None,
                "porcentaje_meta": None,
            }
        }

    montos = [v["monto_total"] for v in ventas]
    total = sum(montos)
    num = len(montos)

    # Hora pico: la hora con mayor facturación
    horas: Dict[str, float] = {}
    for v in ventas:
        hora_key = v.get("hora", "00")[:2]
        horas[hora_key] = horas.get(hora_key, 0.0) + v["monto_total"]
    hora_pico = f"{max(horas, key=horas.get)}:00" if horas else None

    # Producto estrella: el que más unidades se vendió
    productos: Dict[str, int] = {}
    for v in ventas:
        for item in v.get("items", []):
            nombre = item["nombre"]
            productos[nombre] = productos.get(nombre, 0) + item["cantidad"]
    producto_estrella = max(productos, key=productos.get) if productos else None

    # Desglose por método de pago
    metodos: Dict[str, float] = {}
    for v in ventas:
        mp = v.get("metodo_pago", "otro")
        metodos[mp] = metodos.get(mp, 0.0) + v["monto_total"]
    metodo_principal = max(metodos, key=metodos.get) if metodos else None

    # Comparación con el día anterior
    vda = state.get("venta_dia_anterior")
    comp_pct: Optional[float] = None
    if vda and vda > 0:
        comp_pct = round((total - vda) / vda * 100, 1)

    # Porcentaje de meta
    meta = state.get("meta_diaria")
    pct_meta: Optional[float] = round(total / meta * 100, 1) if meta and meta > 0 else None

    return {
        "metricas": {
            "total_ventas": round(total, 2),
            "numero_transacciones": num,
            "ticket_promedio": round(total / num, 2),
            "hora_pico": hora_pico,
            "producto_estrella": producto_estrella,
            "metodos_pago": metodos,
            "metodo_pago_principal": metodo_principal,
            "comparacion_ayer_pct": comp_pct,
            "porcentaje_meta": pct_meta,
        }
    }


# ---------------------------------------------------------------------------
# Nodo 2 – narrativa con Groq/Llama (asíncrono, falla silenciosamente)
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "Eres un asistente amigable para pequeños comerciantes peruanos. "
    "Tu tarea es generar un breve resumen del cierre del día en tono cálido y motivador. "
    "Usa soles peruanos (S/) como moneda. "
    "Sé conciso: máximo 4 oraciones. "
    "Destaca los logros más importantes del día y termina con una recomendación práctica "
    "o palabras de aliento para el comerciante."
)


async def _generar_narrativa_llm(state: SummaryState) -> Dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        logger.warning("GROQ_API_KEY no configurada; se omite narrativa IA")
        return {"resumen_narrativo": None, "error_llm": "GROQ_API_KEY no configurada"}

    m = state["metricas"]
    fecha = state["fecha"]

    comp_text = ""
    if m["comparacion_ayer_pct"] is not None:
        signo = "+" if m["comparacion_ayer_pct"] >= 0 else ""
        comp_text = f"- Comparado con ayer: {signo}{m['comparacion_ayer_pct']}%\n"

    meta_text = ""
    if m["porcentaje_meta"] is not None:
        meta_text = f"- Avance de meta diaria: {m['porcentaje_meta']}%\n"

    contexto = (
        f"Fecha: {fecha}\n"
        f"- Total vendido: S/ {m['total_ventas']:.2f}\n"
        f"- Número de ventas: {m['numero_transacciones']}\n"
        f"- Ticket promedio: S/ {m['ticket_promedio']:.2f}\n"
        f"- Hora de mayor venta: {m['hora_pico'] or 'no disponible'}\n"
        f"- Producto más vendido: {m['producto_estrella'] or 'no disponible'}\n"
        f"- Método de pago principal: {m['metodo_pago_principal'] or 'no disponible'}\n"
        f"{comp_text}"
        f"{meta_text}"
    )

    try:
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=api_key,
            max_tokens=300,
            temperature=0.7,
        )
        messages = [
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=f"Genera el resumen de cierre para este comerciante:\n\n{contexto}"),
        ]
        response = await llm.ainvoke(messages)
        return {"resumen_narrativo": response.content, "error_llm": None}

    except Exception as exc:
        logger.error("Error al llamar al LLM: %s", exc)
        return {"resumen_narrativo": None, "error_llm": str(exc)}


# ---------------------------------------------------------------------------
# Compilación del grafo (se ejecuta una sola vez al importar el módulo)
# ---------------------------------------------------------------------------

def _build_graph():
    graph: StateGraph = StateGraph(SummaryState)
    graph.add_node("calcular_metricas", _calcular_metricas)
    graph.add_node("generar_narrativa", _generar_narrativa_llm)
    graph.set_entry_point("calcular_metricas")
    graph.add_edge("calcular_metricas", "generar_narrativa")
    graph.add_edge("generar_narrativa", END)
    return graph.compile()


_graph = _build_graph()


# ---------------------------------------------------------------------------
# Punto de entrada público
# ---------------------------------------------------------------------------

async def ejecutar_resumen_diario(request: DailySummaryRequest) -> DailySummaryResponse:
    initial_state: SummaryState = {
        "fecha": str(request.fecha),
        "ventas": [v.model_dump() for v in request.ventas],
        "venta_dia_anterior": request.venta_dia_anterior,
        "meta_diaria": request.meta_diaria,
        "metricas": {},
        "resumen_narrativo": None,
        "error_llm": None,
    }

    result = await _graph.ainvoke(initial_state)
    m = result["metricas"]

    return DailySummaryResponse(
        fecha=result["fecha"],
        total_ventas=m["total_ventas"],
        numero_transacciones=m["numero_transacciones"],
        ticket_promedio=m["ticket_promedio"],
        hora_pico=m.get("hora_pico"),
        producto_estrella=m.get("producto_estrella"),
        comparacion_ayer_pct=m.get("comparacion_ayer_pct"),
        porcentaje_meta=m.get("porcentaje_meta"),
        metodos_pago=m.get("metodos_pago", {}),
        resumen_narrativo=result.get("resumen_narrativo"),
        llm_disponible=result.get("error_llm") is None,
    )
