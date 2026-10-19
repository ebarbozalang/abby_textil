from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class TasaCambioOut(BaseModel):
    id: int
    tasa: Decimal
    fuente: str
    activa: bool
    fecha_actualizacion: datetime
    actualizado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TasaManualRequest(BaseModel):
    tasa: Decimal = Field(..., gt=Decimal("0.0000"), description="Nuevo valor de la tasa en Bolívares por Dólar (Bs/$)")


class TasaHistorialOut(BaseModel):
    tasa_actual: TasaCambioOut
    historial: List[TasaCambioOut]
