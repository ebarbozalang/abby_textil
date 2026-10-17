import enum
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Enum as SQLEnum,
    Text,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class TecnicaImpresion(str, enum.Enum):
    DTF = "dtf"
    SUBLIMACION = "sublimacion"
    SERIGRAFIA = "serigrafia"
    BORDADO = "bordado"
    VINILO = "vinilo"
    OTRA = "otra"


class EtapaImpresion(str, enum.Enum):
    ANTES_COSTURA = "antes_costura"
    DESPUES_COSTURA = "despues_costura"


class EstadoEtapaProduccion(str, enum.Enum):
    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    TERMINADO = "terminado"
    CANCELADO = "cancelado"


class OrdenCorte(Base):
    __tablename__ = "ordenes_corte"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    linea_pedido_id = Column(Integer, ForeignKey("lineas_pedido.id", ondelete="CASCADE"), nullable=False, index=True)
    cortador_id = Column(Integer, ForeignKey("trabajadores.id", ondelete="RESTRICT"), nullable=False, index=True)
    fecha = Column(Date, default=date.today, nullable=False)
    cantidad_piezas = Column(Integer, default=1, nullable=False)
    costo_unitario = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    estado = Column(SQLEnum(EstadoEtapaProduccion), default=EstadoEtapaProduccion.PENDIENTE, nullable=False)
    observaciones = Column(String(300), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    pedido = relationship("Pedido", lazy="selectin")
    linea_pedido = relationship("LineaPedido", lazy="selectin")
    cortador = relationship("Trabajador", lazy="selectin")

    def __repr__(self) -> str:
        return f"<OrdenCorte #{self.id} Pedido:{self.pedido_id} Cortador:{self.cortador_id} - {self.estado.value}>"


class OrdenImpresion(Base):
    __tablename__ = "ordenes_impresion"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    linea_pedido_id = Column(Integer, ForeignKey("lineas_pedido.id", ondelete="CASCADE"), nullable=False, index=True)
    tecnico_id = Column(Integer, ForeignKey("trabajadores.id", ondelete="RESTRICT"), nullable=False, index=True)
    tecnica = Column(SQLEnum(TecnicaImpresion), default=TecnicaImpresion.DTF, nullable=False)
    fecha = Column(Date, default=date.today, nullable=False)
    cantidad = Column(Integer, default=1, nullable=False)
    costo_unitario = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    etapa = Column(SQLEnum(EtapaImpresion), default=EtapaImpresion.ANTES_COSTURA, nullable=False)
    estado = Column(SQLEnum(EstadoEtapaProduccion), default=EstadoEtapaProduccion.PENDIENTE, nullable=False)
    observaciones = Column(String(300), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    pedido = relationship("Pedido", lazy="selectin")
    linea_pedido = relationship("LineaPedido", lazy="selectin")
    tecnico = relationship("Trabajador", lazy="selectin")

    def __repr__(self) -> str:
        return f"<OrdenImpresion #{self.id} {self.tecnica.value} Pedido:{self.pedido_id} - {self.estado.value}>"


class OrdenConfeccion(Base):
    __tablename__ = "ordenes_confeccion"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    linea_pedido_id = Column(Integer, ForeignKey("lineas_pedido.id", ondelete="CASCADE"), nullable=False, index=True)
    operador_id = Column(Integer, ForeignKey("trabajadores.id", ondelete="RESTRICT"), nullable=False, index=True)
    fecha = Column(Date, default=date.today, nullable=False)
    cantidad_prendas = Column(Integer, default=1, nullable=False)
    costo_unitario = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    estado = Column(SQLEnum(EstadoEtapaProduccion), default=EstadoEtapaProduccion.PENDIENTE, nullable=False)
    observaciones = Column(String(300), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    pedido = relationship("Pedido", lazy="selectin")
    linea_pedido = relationship("LineaPedido", lazy="selectin")
    operador = relationship("Trabajador", lazy="selectin")

    def __repr__(self) -> str:
        return f"<OrdenConfeccion #{self.id} Pedido:{self.pedido_id} Operador:{self.operador_id} - {self.estado.value}>"
