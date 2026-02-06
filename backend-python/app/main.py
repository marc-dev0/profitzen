from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import router as api_router

app = FastAPI(
    title="Profitzen Analytics API",
    description="Microservicio de analítica predictiva para el control de cajas",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Profitzen Analytics",
        "version": "1.0.0"
    }

# Incluir rutas del API
app.include_router(api_router, prefix="/api/v1")
