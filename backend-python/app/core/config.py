from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    # Clave que el backend .NET debe enviar en el header X-API-Key
    PYTHON_SERVICE_API_KEY: str = "dev_python_api_key_123"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
