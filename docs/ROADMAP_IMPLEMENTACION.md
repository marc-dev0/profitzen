# Profitzen — Roadmap de Implementación

> Última actualización: 2026-06-11
> Stack: Next.js 15 · .NET 9 Microservices · FastAPI + LangGraph · PostgreSQL · Redis · Docker

---

## Estado actual del sistema

Basado en historial de 110 commits en `marc-dev0/profitzen`.

### Módulos completados ✅

| Módulo | Detalle |
|---|---|
| POS (punto de venta) | Búsqueda rápida, UOM múltiple, fracciones/peso, balanza serial (Web Serial API), atajos de teclado completos (F2/F9/flechas), listas de precios, crédito a clientes |
| Inventario | Stock en tiempo real, ajustes, movimientos, alertas |
| Ventas / Historial | Anulaciones, devoluciones, exportación Excel |
| Control de caja | Apertura/cierre de turno, movimientos manuales, ticket de cierre |
| Clientes y crédito | Límite de crédito, historial, cuentas por cobrar |
| Compras / Proveedores | Registro de compras, actualización de stock |
| Reportes y Analytics | Dashboard, top productos, márgenes, ROI |
| Vigilante Nocturno (IA .NET) | Resumen diario generado con Groq — 1 vez/día/tienda, guardado en `SmartSummaries` |
| Analizador de Inventario (IA .NET) | Detecta stock crítico, alto riesgo, capital muerto — genera recomendaciones de compra con Groq |
| Rate limiting IA | Cuota diaria en Gateway + notificación en frontend |
| Observabilidad | Prometheus + Grafana + Jaeger integrados (último commit) |
| Autenticación | JWT, recuperación de contraseña por email |
| Multi-entorno | docker-compose para dev / local / demo / prod |

### Decisiones de arquitectura importantes

**¿Por qué Groq y no Ollama?**
Se intentó Ollama durante varias semanas (commits `2b6a084` → `5c99e4f`). Problemas encontrados:
- OOM errors en el VPS con llama3.2 (necesita 5-6 GB RAM solo para el modelo)
- Tiempos de respuesta de 3-5 minutos por prompt
- Inestabilidad en `host.docker.internal` en Linux
- Decisión final (`5c99e4f`): migración total a Groq API (free tier, sin tarjeta de crédito)

**¿Cuándo volvería a tener sentido Ollama?**
Solo si el VPS se actualiza a 8 GB RAM (Hetzner ~$9/mes extra). No es prioritario mientras Groq free tier cubra la carga (cubre hasta ~50 tiendas activas).

---

## Infraestructura y costos

| Componente | Solución | Costo |
|---|---|---|
| VPS actual | ~2-4 GB RAM, $15/mes | Ya pagado |
| Base de datos | PostgreSQL en el mismo VPS | S/ 0 extra |
| IA — .NET services | Groq free tier (llama-3.3-70b) | S/ 0 |
| IA — backend-python | Groq free tier (migrar de Claude) | S/ 0 |
| Observabilidad | Prometheus + Grafana self-hosted | S/ 0 |
| Upgrade VPS (futuro) | Hetzner 8 GB si se necesita Ollama | ~$9/mes extra |

**Costo extra de infraestructura para todo este roadmap: S/ 0**

---

## Fase A — Backend Python: LangGraph + Groq (Prioridad Alta)

> El microservicio FastAPI + LangGraph ya fue implementado en sesión 2026-06-11 usando Claude Haiku.
> Esta fase lo conecta a Groq para costo cero.

### A1 · Migrar backend-python de Claude Haiku a Groq ✏️ Pendiente

**Archivos:**
- `backend-python/app/services/daily_summary_service.py`
- `backend-python/requirements.txt`

**Cambios:**
- Reemplazar `ChatAnthropic` + `langchain-anthropic` por `ChatGroq` + `langchain-groq`
- Agregar `GROQ_API_KEY` a `.env.example` y `backend-python/.env`
- `ANTHROPIC_API_KEY` pasa a ser opcional (puede quedar en `.env.example` con nota)
- Si Groq falla → el grafo ya tiene fallback silencioso (devuelve métricas sin narrativa)

**Resultado:** Resumen diario LangGraph sin costo de API.

### A2 · Test en vivo del endpoint /resumen-diario ✏️ Pendiente

**Archivo:** `backend-python/test_daily_summary.py` (ya existe)

- Levantar servidor: `uvicorn app.main:app --reload --port 8001`
- Ejecutar: `python test_daily_summary.py`
- Verificar los 3 casos: respuesta exitosa, sin API key (403), sin ventas

### A3 · Agregar backend-python al docker-compose ✏️ Pendiente

**Archivo:** `docker-compose.dev.yml`, `docker-compose.prod.yml`

- El servicio Python no está registrado en ningún compose todavía
- Puerto sugerido: 8001 (interno), no expuesto al exterior
- El .NET Analytics gateway llama a `http://python-analytics:8001` internamente
- Agregar al nginx si se necesita acceso desde el frontend

---

## Fase B — POS Mejorado: Usuarios Tech y No-Tech (Prioridad Alta)

> El POS actual (2194 líneas, `frontend/src/app/pos/page.tsx`) es potente para usuarios
> entrenados pero tiene fricción para el dueño o empleado nuevo.
> Estas mejoras no rompen el flujo actual — son aditivas.

### B1 · Modo Simple / Modo Pro (toggle) ✏️ Pendiente

**Archivo:** `frontend/src/app/pos/page.tsx`

**Modo Pro** (sin cambios — el actual):
- Búsqueda con sintaxis `2*producto`, `250g*arroz`
- Navegación completa por teclado (F2, F9, flechas, Tab)
- Grid compacto

**Modo Simple** (nuevo):
- Grid grande con foto del producto, nombre en tipografía grande y precio prominente
- Tabs de categorías horizontales con iconos (Abarrotes, Bebidas, Lácteos, Limpieza...)
- Botones de pago grandes con color: 🟢 Efectivo · 🟣 Yape · 🔵 Tarjeta · 🟡 Plin
- Sin atajos de teclado, sin sintaxis especial
- Optimizado para touch (tablet o pantalla táctil)
- Texto mínimo 18px

Toggle: botón en esquina superior del POS. Preferencia guardada en `localStorage` por usuario.

### B2 · Mejoras completas de balanza y productos en peso ✏️ Pendiente

#### B2a · Lectura continua con detección de estabilización
**Archivo:** `frontend/src/app/pos/page.tsx`

El flujo actual lee la balanza una sola vez (`connectToScale` expuesto en `window`).
Nuevo flujo:
1. Al abrir turno con balanza detectada → iniciar stream continuo (Web Serial API)
2. Widget permanente en el POS: `⚖ 0.487 kg` visible siempre que haya balanza conectada
3. Estabilización: peso no varía ±2g durante 600ms → considerar estable
4. Si hay producto fraccionable activo → pre-rellenar el modal automáticamente
5. Cajero solo confirma con Enter o toca "Agregar"

#### B2b · Presets de peso configurables por producto
**Archivos:**
- `frontend/src/app/products/new/page.tsx`
- `frontend/src/app/products/[id]/edit/page.tsx`
- `frontend/src/app/pos/page.tsx` (consumir los presets)
- Backend: campo `weightPresets` en servicio de productos

En el formulario de producto, nueva sección:
```
Presets de peso rápido: [25g] [50g] [100g] [250g]  + Agregar preset
(Solo visible si "Permite fracciones" está activo)
```

Ejemplos de uso:
- Mantequilla suelta → 25g, 50g, 100g, 200g
- Arroz granel → 250g, 500g, 1kg, 3kg, 5kg
- Azúcar suelta → 250g, 500g, 1kg

En el modal de peso del POS, estos presets reemplazan los genéricos actuales
`[100g] [250g] [500g] [1 Kg]`.

#### B2c · Diferenciación visual de productos fraccionables
**Archivo:** `frontend/src/app/pos/page.tsx`

En el grid de productos, los que tienen `allowFractional: true`:
- Badge `⚖` en la esquina de la tarjeta
- Si balanza conectada → badge verde pulsante
- Si sin balanza → badge gris con tooltip "Ingrese el peso manualmente"

#### B2d · Flujo táctil sin balanza (teclado numérico en pantalla)
**Archivo:** `frontend/src/app/pos/page.tsx`

Para bodegas sin hardware de balanza:
- Al tocar producto fraccionable → teclado numérico grande en pantalla (no teclado del SO)
- Precio por kg/unidad prominente encima del teclado
- Presets del producto (B2b) como botones táctiles grandes
- Total calculado en tiempo real

### B3 · Panel de productos frecuentes por hora ✏️ Pendiente

**Archivos:**
- `frontend/src/app/pos/page.tsx` (fila de accesos rápidos)
- `backend/src/Services/Analytics/` (nuevo endpoint)

Fila de 6-8 botones en la parte superior del POS con los productos más vendidos
en el rango horario actual, basado en historial de 30 días:
- 6am–10am: leche, pan, huevos, café
- 10am–1pm: gaseosas, snacks, arroz
- 1pm–4pm: gaseosas, embutidos, pan de molde
- 4pm–8pm: helados, chizitos, bebidas

**Nuevo endpoint Analytics:** `GET /api/analytics/frequent-products?hour={h}&storeId={id}`
- Consulta ventas agrupadas por hora de los últimos 30 días
- Devuelve top 8 productos del rango horario actual
- Cache de 1 hora (no cambia cada minuto)

Un toque en el producto → agrega directamente al carrito (sin búsqueda).

**Conexión UTEC:** Módulo 7 (Aprendizaje por logs) + Módulo 4 (Agentes cognitivos).

---

## Fase C — IA Conversacional en el POS (Prioridad Media)

### C1 · Chatbot "Consulta rápida" dentro del POS ✏️ Pendiente

**Archivos:**
- Nuevo componente: `frontend/src/components/POSAssistant/`
- Nuevo router: `backend-python/app/api/pos_assistant_router.py`
- Nuevo grafo LangGraph: `backend-python/app/services/pos_assistant_service.py`

Ícono flotante `💬` en el POS que abre un mini-chat lateral.
El cajero o dueño puede preguntar en lenguaje natural:

- *"¿Cuánto llevo vendido hoy?"* → consulta ventas del turno
- *"¿Cuánto stock me queda de arroz?"* → consulta inventario
- *"¿Cuál fue mi mejor hora de ayer?"* → analytics
- *"¿Qué productos se me van a acabar?"* → rotación

**Arquitectura LangGraph con tools (Módulo 5 UTEC):**
```
Pregunta del usuario
        ↓
  Nodo: clasificar intención
        ↓
  Nodo: llamar tool correspondiente
   ├── tool_ventas_hoy()
   ├── tool_stock(producto)
   ├── tool_mejor_hora()
   └── tool_alertas_stock()
        ↓
  Nodo: redactar respuesta en español peruano
        ↓
  Respuesta al frontend
```

**Conexión UTEC:** Módulo 5 (LangChain Agents + tools) + Módulo 6 (Conexión con APIs reales).

### C2 · Asistente de voz en búsqueda ✏️ Pendiente

**Archivo:** `frontend/src/app/pos/page.tsx`

Botón de micrófono junto al campo de búsqueda. Usa Web Speech API (Chrome/Edge, sin costo):
- *"Dos Inca Kola grande"* → busca y agrega con cantidad 2
- *"Medio kilo de arroz"* → abre modal de peso con 0.5 pre-rellenado
- *"Cobra con Yape"* → selecciona método de pago Yape

Solo activo en Modo Simple para no interferir con el flujo de teclado del Modo Pro.

**Conexión UTEC:** Módulo 6 (Multimodalidad).

---

## Fase D — Agentes Cognitivos Avanzados (Prioridad Baja — sincronizado con curso UTEC)

> Implementar a medida que avancen los módulos del curso UTEC (junio → octubre 2026).

### D1 · Memoria contextual del Vigilante Nocturno
**Módulo UTEC:** 4 (Agentes con memoria contextual) — julio 2026

El Vigilante analiza solo el día de hoy. Con memoria:
- Compara contra los últimos 7 y 30 días
- Detecta "peor semana del mes", "3 días seguidos mejorando"
- Inyecta contexto histórico al prompt del día siguiente

**Archivo:** `backend/src/Services/Analytics/Application/Services/AnalyticsService.cs`

### D2 · Agente reflexivo de inventario
**Módulo UTEC:** 10 (Agentes reflexivos) — julio 2026

Antes de publicar el análisis, el agente evalúa su propia respuesta:
- ¿Mencioné todos los productos críticos?
- ¿La recomendación tiene sentido para el capital del comerciante?
- Si no → se autocorrige antes de enviar

### D3 · Feedback loop del comerciante
**Módulo UTEC:** 7 (Feedback y corrección) — agosto 2026

- Botón "Útil ✓ / No útil ✗" en cada resumen del Vigilante
- Si el comerciante rechaza → registrar en BD
- El prompt del día siguiente incluye ese contexto

**Archivos:** Frontend (botón) + tabla `SmartSummaryFeedback` en BD.

### D4 · Sistema multiagente: Ventas + Inventario + Finanzas
**Módulo UTEC:** 8 (Planeamiento multiagente) — septiembre 2026

Tres agentes LangGraph cooperando:
- `AgenteVentas` → analiza tendencias de caja y tickets
- `AgenteInventario` → detecta quiebres y stock muerto
- `AgenteConciliador` → cruza ambos y genera el plan del día siguiente

Output ejemplo:
> *"Vendiste mucho arroz hoy (+40%) pero te quedan solo 3kg. Con tu ritmo actual
> se acaba mañana a las 2pm. Te recomiendo comprar al menos 10kg esta tarde."*

**Este sistema es el candidato para el Proyecto Final del curso UTEC (octubre 2026).**

---

## Fase E — Proyecto Final UTEC (Octubre 2026)

### E1 · Arquitectura formal documentada
- Diagrama del grafo LangGraph completo
- Documentación de cada nodo, edge y tool
- Justificación de elección de modelos

### E2 · Evaluación comparativa de modelos
**Módulo UTEC:** 9 (Evaluación comparativa)

Benchmark: Groq llama-3.3-70b vs Claude Haiku vs modelos futuros en:
- Calidad de resumen para comerciante peruano (escala 1-5)
- Latencia por llamada
- Consistencia en nombres de productos peruanos
- Costo por 1,000 llamadas

### E3 · Consideraciones éticas
**Módulo UTEC:** 9 (Ética)

- El sistema no inventa ni redondea números de ventas
- Si los datos están incompletos, lo dice explícitamente
- Los datos del comerciante no salen del stack propio (Groq sí envía datos a su API — documentar esto)

---

## Tabla resumen de pendientes

| ID | Feature | Archivo(s) principal(es) | Esfuerzo | Prioridad |
|---|---|---|---|---|
| A1 | Migrar Python de Claude a Groq | `daily_summary_service.py`, `requirements.txt` | S | Alta |
| A2 | Test en vivo /resumen-diario | `test_daily_summary.py` | S | Alta |
| A3 | Agregar backend-python al docker-compose | `docker-compose.dev.yml`, `prod.yml` | S | Alta |
| B1 | Modo Simple / Modo Pro toggle | `pos/page.tsx` | L | Alta |
| B2a | Lectura continua balanza | `pos/page.tsx` | M | Alta |
| B2b | Presets de peso por producto | `pos/page.tsx`, `products/new`, `products/[id]/edit` | M | Alta |
| B2c | Badge visual fraccionables | `pos/page.tsx` | S | Alta |
| B2d | Teclado numérico táctil sin balanza | `pos/page.tsx` | M | Alta |
| B3 | Productos frecuentes por hora | `pos/page.tsx`, Analytics endpoint | M | Media |
| C1 | Chatbot consulta rápida POS | `backend-python/` + nuevo componente frontend | L | Media |
| C2 | Asistente de voz en búsqueda | `pos/page.tsx` | S | Media |
| D1 | Memoria contextual Vigilante | `AnalyticsService.cs` | M | Baja |
| D2 | Agente reflexivo inventario | `daily_summary_service.py` | M | Baja |
| D3 | Feedback loop comerciante | Frontend + BD | M | Baja |
| D4 | Sistema multiagente 3 agentes | `backend-python/` nuevo grafo | XL | Baja |
| E1-E3 | Proyecto Final UTEC | Todo el stack | XL | Oct 2026 |

> **Esfuerzo:** S = pocas horas · M = 1-2 días · L = 3-5 días · XL = semanas

---

## Variables de entorno necesarias

```bash
# .env (raíz del proyecto) — sin cambios
DB_USER=postgres
DB_PASSWORD=secure_password_here
JWT_SECRET=your_very_secure_jwt_secret_key_minimum_32_chars
SERVICE_KEY=internal_service_security_key
DOMAIN_NAME=example.com

# backend-python/.env — actualizar después de Fase A1
PYTHON_SERVICE_API_KEY=your_python_service_api_key_here
GROQ_API_KEY=your_groq_api_key_here       # reemplaza ANTHROPIC_API_KEY
# ANTHROPIC_API_KEY=                       # ya no necesaria

# .NET Analytics — sin cambios (Groq ya configurado)
# AI__GroqUrl, AI__Model, AI__ApiKey en appsettings o docker-compose
```

---

## Instrucciones de arranque (próxima sesión)

```bash
# 1. Leer este archivo para saber dónde estás
# 2. Ver el último daily-progress para ver en qué quedó la sesión anterior
# 3. Levantar el stack local
docker-compose -f docker-compose.local.yml up -d postgres redis

# 4. Frontend
cd frontend && npm run dev

# 5. Backend Python (si trabajas en Fase A/C)
cd backend-python
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```
