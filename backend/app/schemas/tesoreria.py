from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.tesoreria import MetodoPago


class PagoCreate(BaseModel):
    pedido_id: int
    monto: Decimal = Field(..., gt=Decimal("0.00"), description="Monto del pago, debe ser mayor a 0")
    metodo: MetodoPago = MetodoPago.EFECTIVO
    referencia: Optional[str] = Field(None, max_length=100)
    fecha: Optional[date] = None


class PagoOut(BaseModel):
    id: int
    pedido_id: int
    cliente_id: int
    fecha: date
    monto: Decimal
    metodo: MetodoPago
    referencia: Optional[str] = None
    registrado_por: Optional[int] = None
    creado_en: datetime
    cliente_nombre: Optional[str] = None
    registrado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AbonoCreditoCreate(BaseModel):
    cliente_id: int
    pedido_id: Optional[int] = None
    monto: Decimal = Field(..., gt=Decimal("0.00"), description="Monto del abono, debe ser mayor a 0")
    metodo: MetodoPago = MetodoPago.EFECTIVO
    referencia: Optional[str] = Field(None, max_length=100)
    notas: Optional[str] = None
    fecha: Optional[date] = None


class AbonoCreditoOut(BaseModel):
    id: int
    cliente_id: int
    pedido_id: Optional[int] = None
    fecha: date
    monto: Decimal
    metodo: MetodoPago
    referencia: Optional[str] = None
    notas: Optional[str] = None
    registrado_por: Optional[int] = None
    creado_en: datetime
    cliente_nombre: Optional[str] = None
    registrado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MetodoResumen(BaseModel):
    metodo: str
    total: Decimal
    cantidad: int


class MovimientoCajaItem(BaseModel):
    id: int
    tipo: str  # 'pago_pedido' o 'abono_credito'
    fecha: date
    monto: Decimal
    metodo: MetodoPago
    referencia: Optional[str] = None
    cliente_id: int
    cliente_nombre: str
    pedido_id: Optional[int] = None
    registrado_por_nombre: Optional[str] = None


class CierreCajaOut(BaseModel):
    fecha: date
    total_recaudado: Decimal
    total_efectivo: Decimal
    total_transferencias: Decimal
    total_billeteras_digitales: Decimal  # nequi + daviplata
    total_tarjetas: Decimal
    total_otros: Decimal
    desglose_metodos: List[MetodoResumen]
    movimientos: List[MovimientoCajaItem]


class CuentaPorCobrarOut(BaseModel):
    cliente_id: int
    cliente_nombre: str
    documento: str
    telefono: Optional[str] = None
    credito_maximo: Decimal
    saldo_pendiente_global: Decimal
    porcentaje_cupo_usado: float
    alerta_riesgo: str  # 'normal', 'alerta', 'bloqueado'
    pedidos_pendientes_count: int
    pedido_mas_antiguo_fecha: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)
