from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.produccion import TecnicaImpresion, EtapaImpresion, EstadoEtapaProduccion
from app.schemas.pedido import LineaPedidoOut


class TrabajadorSimpleOut(BaseModel):
    id: int
    nombre: str
    documento: str
    tipo_pago: str

    model_config = ConfigDict(from_attributes=True)


# --- ORDEN DE CORTE ---
class OrdenCorteCreate(BaseModel):
    linea_pedido_id: int
    cortador_id: int
    cantidad_piezas: int = Field(..., gt=0)
    costo_unitario: Decimal = Field(default=Decimal("1500.00"), ge=0)
    observaciones: Optional[str] = None


class OrdenCorteOut(BaseModel):
    id: int
    pedido_id: int
    linea_pedido_id: int
    cortador_id: int
    fecha: date
    cantidad_piezas: int
    costo_unitario: Decimal
    total: Decimal
    estado: EstadoEtapaProduccion
    observaciones: Optional[str] = None
    creado_en: datetime
    cortador: Optional[TrabajadorSimpleOut] = None
    linea_pedido: Optional[LineaPedidoOut] = None

    model_config = ConfigDict(from_attributes=True)


# --- ORDEN DE IMPRESIÓN ---
class OrdenImpresionCreate(BaseModel):
    linea_pedido_id: int
    tecnico_id: int
    tecnica: TecnicaImpresion = TecnicaImpresion.DTF
    cantidad: int = Field(..., gt=0)
    costo_unitario: Decimal = Field(default=Decimal("3000.00"), ge=0)
    etapa: EtapaImpresion = EtapaImpresion.ANTES_COSTURA
    observaciones: Optional[str] = None


class OrdenImpresionOut(BaseModel):
    id: int
    pedido_id: int
    linea_pedido_id: int
    tecnico_id: int
    tecnica: TecnicaImpresion
    fecha: date
    cantidad: int
    costo_unitario: Decimal
    total: Decimal
    etapa: EtapaImpresion
    estado: EstadoEtapaProduccion
    observaciones: Optional[str] = None
    creado_en: datetime
    tecnico: Optional[TrabajadorSimpleOut] = None
    linea_pedido: Optional[LineaPedidoOut] = None

    model_config = ConfigDict(from_attributes=True)


# --- ORDEN DE CONFECCIÓN ---
class OrdenConfeccionCreate(BaseModel):
    linea_pedido_id: int
    operador_id: int
    cantidad_prendas: int = Field(..., gt=0)
    costo_unitario: Decimal = Field(default=Decimal("5000.00"), ge=0)
    observaciones: Optional[str] = None


class OrdenConfeccionOut(BaseModel):
    id: int
    pedido_id: int
    linea_pedido_id: int
    operador_id: int
    fecha: date
    cantidad_prendas: int
    costo_unitario: Decimal
    total: Decimal
    estado: EstadoEtapaProduccion
    observaciones: Optional[str] = None
    creado_en: datetime
    operador: Optional[TrabajadorSimpleOut] = None
    linea_pedido: Optional[LineaPedidoOut] = None

    model_config = ConfigDict(from_attributes=True)


# --- TABLERO KANBAN RESUMEN ---
class TableroProduccionOut(BaseModel):
    corte: List[OrdenCorteOut] = []
    impresion: List[OrdenImpresionOut] = []
    confeccion: List[OrdenConfeccionOut] = []


# --- ESCANEO RÁPIDO DE QR ---
class EscanearQrRequest(BaseModel):
    codigo_rastreo_unico: str
    trabajador_id: int
    costo_unitario: Optional[Decimal] = None
    observaciones: Optional[str] = None


class EscanearQrResponse(BaseModel):
    status: str
    mensaje: str
    codigo_rastreo_unico: str
    pedido_id: int
    linea_id: int
    etapa_completada: str
    siguiente_etapa: str
    monto_generado: Decimal
