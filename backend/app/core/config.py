from typing import List, Union
import json
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AbbySoft — Sistema de Gestión Textil"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Seguridad y JWT
    SECRET_KEY: str = "textil_super_secret_jwt_key_2026_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas

    # Base de Datos (Async: PostgreSQL o SQLite)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:123456@127.0.0.1:5432/textil_app"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return ["*"]
        return v

    # Reglas de negocio globales - Venezuela
    MONEDA_DEFAULT: str = "USD"
    MONEDA_SECUNDARIA: str = "BS"
    TIMEZONE: str = "America/Caracas"
    TASA_BCV_DEFAULT: float = 45.0
    ANTICIPO_MINIMO_PORCENTAJE: float = 30.0

    # Usuario Superusuario Inicial
    FIRST_SUPERUSER_EMAIL: str = "admin@textilapp.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    FIRST_SUPERUSER_NOMBRE: str = "Administrador Principal"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
