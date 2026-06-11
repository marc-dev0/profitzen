"""
Script de prueba manual para el endpoint POST /api/v1/resumen-diario.

Uso:
    1. Levanta el servidor:  uvicorn app.main:app --reload --port 8001
    2. Crea un archivo .env en backend-python/ con:
           PYTHON_SERVICE_API_KEY=dev_python_api_key_123
           ANTHROPIC_API_KEY=sk-ant-...
    3. Ejecuta este script:  python test_daily_summary.py
"""

import asyncio
import json

import httpx

# ── Configuración ──────────────────────────────────────────────────────────
BASE_URL = "http://localhost:8001"
API_KEY = "dev_python_api_key_123"   # debe coincidir con PYTHON_SERVICE_API_KEY en .env
# Asegúrate de tener GROQ_API_KEY en backend-python/.env (console.groq.com — free tier)
# ──────────────────────────────────────────────────────────────────────────


PAYLOAD = {
    "fecha": "2026-06-11",
    "ventas": [
        {
            "id": "v001",
            "hora": "09:15",
            "monto_total": 45.50,
            "metodo_pago": "efectivo",
            "items": [
                {"nombre": "Leche Gloria 1L", "cantidad": 2, "precio_unitario": 5.50},
                {"nombre": "Pan integral 500g", "cantidad": 3, "precio_unitario": 4.50},
                {"nombre": "Huevos x12", "cantidad": 1, "precio_unitario": 18.00},
            ],
        },
        {
            "id": "v002",
            "hora": "11:30",
            "monto_total": 120.00,
            "metodo_pago": "yape",
            "items": [
                {"nombre": "Arroz Costeño 5kg", "cantidad": 2, "precio_unitario": 25.00},
                {"nombre": "Aceite Primor 1L", "cantidad": 2, "precio_unitario": 15.00},
                {"nombre": "Azúcar 1kg", "cantidad": 4, "precio_unitario": 10.00},
            ],
        },
        {
            "id": "v003",
            "hora": "13:05",
            "monto_total": 38.00,
            "metodo_pago": "tarjeta",
            "items": [
                {"nombre": "Gaseosa Inca Kola 1.5L", "cantidad": 4, "precio_unitario": 5.50},
                {"nombre": "Snack chizitos", "cantidad": 6, "precio_unitario": 3.00},
            ],
        },
        {
            "id": "v004",
            "hora": "15:45",
            "monto_total": 85.00,
            "metodo_pago": "yape",
            "items": [
                {"nombre": "Arroz Costeño 5kg", "cantidad": 1, "precio_unitario": 25.00},
                {"nombre": "Leche Gloria 1L", "cantidad": 4, "precio_unitario": 5.50},
                {"nombre": "Detergente Ariel 500g", "cantidad": 3, "precio_unitario": 12.00},
            ],
        },
        {
            "id": "v005",
            "hora": "17:20",
            "monto_total": 22.50,
            "metodo_pago": "efectivo",
            "items": [
                {"nombre": "Pan integral 500g", "cantidad": 5, "precio_unitario": 4.50},
            ],
        },
    ],
    "venta_dia_anterior": 280.00,
    "meta_diaria": 500.00,
}


async def test_resumen_exitoso():
    print("\n" + "=" * 60)
    print("TEST 1: Resumen exitoso con datos completos")
    print("=" * 60)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/resumen-diario",
            json=PAYLOAD,
            headers={"X-API-Key": API_KEY},
            timeout=30.0,
        )
    if resp.status_code == 200:
        data = resp.json()
        print("✅ Respuesta exitosa (200)")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"❌ Error {resp.status_code}: {resp.text}")


async def test_sin_api_key():
    print("\n" + "=" * 60)
    print("TEST 2: Petición sin API key (debe devolver 403)")
    print("=" * 60)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/resumen-diario",
            json=PAYLOAD,
            timeout=10.0,
        )
    if resp.status_code == 403:
        print("✅ Correctamente rechazado (403)")
    else:
        print(f"❌ Se esperaba 403, recibido {resp.status_code}: {resp.text}")


async def test_sin_ventas():
    print("\n" + "=" * 60)
    print("TEST 3: Resumen con lista de ventas vacía")
    print("=" * 60)
    payload_vacio = {"fecha": "2026-06-11", "ventas": []}
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/v1/resumen-diario",
            json=payload_vacio,
            headers={"X-API-Key": API_KEY},
            timeout=30.0,
        )
    if resp.status_code == 200:
        data = resp.json()
        print("✅ Manejó ventas vacías correctamente")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"❌ Error {resp.status_code}: {resp.text}")


async def main():
    print("Profitzen – Test manual del endpoint /resumen-diario")
    print(f"Servidor: {BASE_URL}")
    try:
        await test_resumen_exitoso()
        await test_sin_api_key()
        await test_sin_ventas()
    except httpx.ConnectError:
        print(
            "\n❌ No se pudo conectar al servidor."
            "\n   Asegúrate de tener el servidor corriendo:"
            "\n   cd backend-python && uvicorn app.main:app --reload --port 8001"
        )


if __name__ == "__main__":
    asyncio.run(main())
