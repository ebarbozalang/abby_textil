from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.usuario import RolUsuario
from app.models.configuracion import ConfiguracionEmpresa

router = APIRouter(prefix="/configuracion", tags=["Configuración & Empresa"])

_ADMIN_ROLES = [RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]

DEFAULT_CONFIG = {
    "nombre_empresa": "Inversiones AbbySoft Textil C.A.",
    "rif": "J-40812345-6",
    "direccion": "Av. Bolívar Este, C.C. Galerías Plaza, Nivel 1, Local 42, Maracay, Aragua, Venezuela",
    "correo": "contacto@abbysoft.com.ve",
    "telefonos": "+58 412 1234567 / +58 243 2345678",
    "slogan": "Tu Visión, Nuestro Código.",
    "logo_url": "/logo.png",
    "theme_mode": "dark",
    "color_primario": "#7B0078",
}


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────
class ConfiguracionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre_empresa: str
    rif: str
    direccion: str
    correo: str
    telefonos: str
    slogan: Optional[str] = None
    logo_url: Optional[str] = "/logo.png"
    theme_mode: str = "dark"
    color_primario: str = "#7B0078"
    updated_at: Optional[datetime] = None


class ConfiguracionUpdate(BaseModel):
    nombre_empresa: Optional[str] = None
    rif: Optional[str] = None
    direccion: Optional[str] = None
    correo: Optional[str] = None
    telefonos: Optional[str] = None
    slogan: Optional[str] = None
    logo_url: Optional[str] = None
    theme_mode: Optional[str] = None
    color_primario: Optional[str] = None


async def _obtener_o_crear_config(db: AsyncSession) -> ConfiguracionEmpresa:
    result = await db.execute(select(ConfiguracionEmpresa).order_by(ConfiguracionEmpresa.id.asc()).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = ConfiguracionEmpresa(**DEFAULT_CONFIG)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────
@router.get("", response_model=ConfiguracionOut)
async def obtener_configuracion(db: AsyncSession = Depends(get_db)):
    """Obtiene los datos de la empresa, logotipo y tema del sistema."""
    config = await _obtener_o_crear_config(db)
    return config


@router.put(
    "",
    response_model=ConfiguracionOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def actualizar_configuracion(
    datos: ConfiguracionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualiza los datos de la empresa, logotipo y personalización de colores/tema."""
    config = await _obtener_o_crear_config(db)

    update_dict = datos.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(config, key, value)

    config.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(config)
    return config


@router.post(
    "/restablecer",
    response_model=ConfiguracionOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def restablecer_predeterminados(db: AsyncSession = Depends(get_db)):
    """Restablece los datos de la empresa y apariencia a los valores predeterminados de AbbySoft."""
    config = await _obtener_o_crear_config(db)

    for key, value in DEFAULT_CONFIG.items():
        setattr(config, key, value)

    config.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(config)
    return config
