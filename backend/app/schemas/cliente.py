from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr


class ClienteBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    documento: str = Field(..., min_length=3, max_length=50)
    telefono: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None
    credito_maximo: Decimal = Field(default=Decimal("0.00"), ge=0)
    activo: bool = True


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    documento: Optional[str] = Field(None, min_length=3, max_length=50)
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[EmailStr] = None
    credito_maximo: Optional[Decimal] = Field(None, ge=0)
    activo: Optional[bool] = None


class ClienteOut(BaseModel):
    id: int
    nombre: str
    documento: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    credito_maximo: Decimal
    saldo_pendiente_global: Decimal
    credito_disponible: float
    excede_credito: bool
    activo: bool
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
