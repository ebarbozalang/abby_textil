from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.trabajador import TipoPago, EstadoNomina


class TrabajadorBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=120)
    documento: str = Field(..., min_length=3, max_length=50)
    telefono: Optional[str] = Field(None, max_length=30)
    tipo_pago: TipoPago = TipoPago.PRODUCCION
    salario_fijo: Decimal = Field(default=Decimal("0.00"), ge=0)
    fecha_ingreso: date = Field(default_factory=date.today)
    activo: bool = True


class TrabajadorCreate(TrabajadorBase):
    usuario_id: Optional[int] = None


class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=120)
    documento: Optional[str] = Field(None, min_length=3, max_length=50)
    telefono: Optional[str] = None
    tipo_pago: Optional[TipoPago] = None
    salario_fijo: Optional[Decimal] = Field(None, ge=0)
    activo: Optional[bool] = None


class TrabajadorOut(TrabajadorBase):
    id: int
    usuario_id: Optional[int] = None
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class ProduccionDiariaCreate(BaseModel):
    trabajador_id: int
    fecha: Optional[date] = None
    orden_tipo: str
    orden_id: int
    cantidad: int = Field(..., gt=0)
    monto_generado: Decimal = Field(..., ge=0)


class ProduccionDiariaOut(BaseModel):
    id: int
    trabajador_id: int
    fecha: date
    orden_tipo: str
    orden_id: int
    cantidad: int
    monto_generado: Decimal
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class LiquidarNominaRequest(BaseModel):
    periodo_inicio: date
    periodo_fin: date
    trabajador_id: Optional[int] = None  # None = liquidar a todos los activos


class NominaOut(BaseModel):
    id: int
    trabajador_id: int
    periodo_inicio: date
    periodo_fin: date
    tipo: TipoPago
    total_producido: int
    monto_fijo: Decimal
    monto_produccion: Decimal
    total: Decimal
    estado: EstadoNomina
    fecha_pago: Optional[datetime] = None
    creado_en: datetime
    trabajador: Optional[TrabajadorOut] = None

    model_config = ConfigDict(from_attributes=True)
