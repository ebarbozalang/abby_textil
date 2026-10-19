from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.tesoreria import MetodoPago, MonedaPago


class PagoCreate(BaseModel):
    pedido_id: int
    monto: Decimal = Field(..., gt=Decimal("0.00"), description="Monto entregado por el cliente en la moneda especificada")
    moneda_pago: MonedaPago = Field(default=MonedaPago.USD, description="Moneda de entrega: USD o BS")
    metodo: MetodoPago = Field(default=MetodoPago.EFECTIVO_USD, description="Método de pago venezolano")
    tasa_cambio: Optional[Decimal] = Field(None, gt=Decimal("0.0000"), description="Tasa de cambio personalizada para este pago. Si se omite, se usa la tasa activa del BCV")
    banco: Optional[str] = Field(None, max_length=100, description="Banco emisor/receptor (Banesco, Mercantil, BDV, etc.)")
    telefono: Optional[str] = Field(None, max_length=50, description="Teléfono del titular para Pago Móvil")
    referencia: Optional[str] = Field(None, max_length=100, description="Número de referencia o comprobante")
    fecha: Optional[date] = None


class PagoOut(BaseModel):
    id: int
    pedido_id: int
    cliente_id: int
    fecha: date
    monto: Decimal # Equivalente en USD que amortiza la deuda
    monto_usd: Decimal
    monto_bs: Decimal
    moneda_pago: MonedaPago
    tasa_cambio: Decimal
    metodo: MetodoPago
    banco: Optional[str] = None
    telefono: Optional[str] = None
    referencia: Optional[str] = None
    registrado_por: Optional[int] = None
    creado_en: datetime
    cliente_nombre: Optional[str] = None
    registrado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AbonoCreditoCreate(BaseModel):
    cliente_id: int
    pedido_id: Optional[int] = None
    monto: Decimal = Field(..., gt=Decimal("0.00"), description="Monto del abono")
    moneda_pago: MonedaPago = Field(default=MonedaPago.USD, description="Moneda de entrega: USD o BS")
    metodo: MetodoPago = Field(default=MetodoPago.EFECTIVO_USD, description="Método de pago")
    tasa_cambio: Optional[Decimal] = Field(None, gt=Decimal("0.0000"), description="Tasa del abono")
    banco: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=50)
    referencia: Optional[str] = Field(None, max_length=100)
    notas: Optional[str] = None
    fecha: Optional[date] = None


class AbonoCreditoOut(BaseModel):
    id: int
    cliente_id: int
    pedido_id: Optional[int] = None
    fecha: date
    monto: Decimal # Base USD
    monto_usd: Decimal
    monto_bs: Decimal
    moneda_pago: MonedaPago
    tasa_cambio: Decimal
    metodo: MetodoPago
    banco: Optional[str] = None
    telefono: Optional[str] = None
    referencia: Optional[str] = None
    notas: Optional[str] = None
    registrado_por: Optional[int] = None
    creado_en: datetime
    cliente_nombre: Optional[str] = None
    registrado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MetodoResumen(BaseModel):
    metodo: str
    nombre_legible: str
    moneda_base: str
    total_usd: Decimal
    total_bs: Decimal
    cantidad: int


class MovimientoCajaItem(BaseModel):
    id: int
    tipo: str  # 'pago_pedido' o 'abono_credito'
    fecha: date
    monto_usd: Decimal
    monto_bs: Decimal
    moneda_pago: MonedaPago
    tasa_cambio: Decimal
    metodo: MetodoPago
    banco: Optional[str] = None
    telefono: Optional[str] = None
    referencia: Optional[str] = None
    cliente_id: int
    cliente_nombre: str
    pedido_id: Optional[int] = None
    registrado_por_nombre: Optional[str] = None


class CierreCajaOut(BaseModel):
    fecha: date
    tasa_referencia: Decimal
    # Totales globales consolidados
    total_recaudado_usd: Decimal
    total_recaudado_bs: Decimal
    # Desglose específico por métodos venezolanos
    total_efectivo_usd: Decimal
    total_zelle: Decimal
    total_binance: Decimal
    total_pago_movil: Decimal
    total_transferencias_bs: Decimal
    total_punto_venta: Decimal
    total_efectivo_bs: Decimal
    total_otros: Decimal
    desglose_metodos: List[MetodoResumen]
    movimientos: List[MovimientoCajaItem]


class CuentaPorCobrarOut(BaseModel):
    cliente_id: int
    cliente_nombre: str
    documento: str
    telefono: Optional[str] = None
    credito_maximo: Decimal # USD
    saldo_pendiente_global: Decimal # USD
    saldo_pendiente_bs: Decimal # Bs.
    tasa_cambio: Decimal
    porcentaje_cupo_usado: float
    alerta_riesgo: str  # 'normal', 'alerta', 'bloqueado'
    pedidos_pendientes_count: int
    pedido_mas_antiguo_fecha: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)
