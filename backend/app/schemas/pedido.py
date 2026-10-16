from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.pedido import EstadoPedido
from app.schemas.cliente import ClienteOut
from app.schemas.auth import UsuarioOut
from app.schemas.producto import VarianteOut


class LineaPedidoCreate(BaseModel):
    variante_id: int
    cantidad: int = Field(..., gt=0, description="Cantidad de prendas")
    precio_unitario: Decimal = Field(..., ge=0, description="Precio unitario pactado")


class LineaPedidoOut(BaseModel):
    id: int
    pedido_id: int
    variante_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal
    estado_produccion: str
    codigo_rastreo_unico: str
    fecha_entrega_linea: Optional[date] = None
    variante: Optional[VarianteOut] = None

    model_config = ConfigDict(from_attributes=True)


class HistorialPedidoOut(BaseModel):
    id: int
    pedido_id: int
    usuario_id: Optional[int] = None
    estado_anterior: Optional[str] = None
    estado_nuevo: str
    observacion: Optional[str] = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


class PedidoCreate(BaseModel):
    cliente_id: int
    descuento: Decimal = Field(default=Decimal("0.00"), ge=0)
    anticipo: Decimal = Field(default=Decimal("0.00"), ge=0)
    fecha_entrega_estimada: Optional[date] = None
    notas: Optional[str] = None
    lineas: List[LineaPedidoCreate] = Field(..., min_length=1, description="Al menos una prenda requerida")


class CambioEstadoPedido(BaseModel):
    nuevo_estado: EstadoPedido
    observacion: Optional[str] = None


class PedidoOut(BaseModel):
    id: int
    cliente_id: int
    vendedor_id: int
    fecha: date
    estado: EstadoPedido
    subtotal: Decimal
    descuento: Decimal
    total: Decimal
    anticipo: Decimal
    saldo_pendiente: Decimal
    porcentaje_anticipo: float
    cumple_anticipo_minimo: bool
    fecha_entrega_estimada: Optional[date] = None
    notas: Optional[str] = None
    creado_en: datetime
    cliente: Optional[ClienteOut] = None
    vendedor: Optional[UsuarioOut] = None
    lineas: List[LineaPedidoOut] = []
    historial: List[HistorialPedidoOut] = []

    model_config = ConfigDict(from_attributes=True)
