from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

from .config import settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(_api_key_header)) -> str:
    if not api_key or api_key != settings.PYTHON_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Key inválida o no proporcionada",
        )
    return api_key
