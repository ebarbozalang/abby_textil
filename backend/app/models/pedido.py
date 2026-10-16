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


class EstadoPedido(str, enum.Enum):
    BORRADOR = "borrador"
    CONFIRMADO = "confirmado"
    PENDIENTE_CORTE = "pendiente_corte"
    EN_CORTE = "en_corte"
    PENDIENTE_IMPRESION = "pendiente_impresion"
    EN_IMPRESION = "en_impresion"
    PENDIENTE_CONFECCION = "pendiente_confeccion"
    EN_CONFECCION = "en_confeccion"
    CONTROL_CALIDAD = "control_calidad"
    TERMINADO = "terminado"
    ENTREGADO = "entregado"
    CANCELADO = "cancelado"


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    vendedor_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    fecha = Column(Date, default=date.today, nullable=False)
    estado = Column(SQLEnum(EstadoPedido), default=EstadoPedido.BORRADOR, nullable=False, index=True)
    subtotal = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    descuento = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    total = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    anticipo = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    saldo_pendiente = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    fecha_entrega_estimada = Column(Date, nullable=True)
    notas = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    cliente = relationship("Cliente", lazy="selectin")
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id], lazy="selectin")
    lineas = relationship("LineaPedido", back_populates="pedido", cascade="all, delete-orphan", lazy="selectin")
    historial = relationship("HistorialPedido", back_populates="pedido", cascade="all, delete-orphan", lazy="selectin", order_by="HistorialPedido.fecha.desc()")

    @property
    def porcentaje_anticipo(self) -> float:
        """Calcula el porcentaje de anticipo abonado respecto al total."""
        if float(self.total) <= 0:
            return 100.0
        return round((float(self.anticipo) / float(self.total)) * 100, 2)

    @property
    def cumple_anticipo_minimo(self) -> bool:
        """Valida si cumple con el anticipo mínimo requerido (30%)."""
        return self.porcentaje_anticipo >= 30.0

    def __repr__(self) -> str:
        return f"<Pedido #{self.id} - Cliente: {self.cliente_id} - Total: {self.total} ({self.estado.value})>"


class LineaPedido(Base):
    __tablename__ = "lineas_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    variante_id = Column(Integer, ForeignKey("variantes.id", ondelete="RESTRICT"), nullable=False, index=True)
    cantidad = Column(Integer, default=1, nullable=False)
    precio_unitario = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    subtotal = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    estado_produccion = Column(String(50), default="pendiente_corte", nullable=False)
    codigo_rastreo_unico = Column(String(100), unique=True, index=True, nullable=False)
    fecha_entrega_linea = Column(Date, nullable=True)

    # Relaciones
    pedido = relationship("Pedido", back_populates="lineas")
    variante = relationship("Variante", lazy="selectin")

    @classmethod
    def generar_codigo_rastreo(cls, pedido_id: int, sku_unico: str, indice: int) -> str:
        """
        Genera código de rastreo único para trazabilidad física e impresión de QR.
        Ejemplo: RAS-PED1001-CAMOXF-BLA-M-01
        """
        sku_clean = sku_unico.replace(" ", "").upper()
        return f"RAS-PED{pedido_id}-{sku_clean}-{str(indice).zfill(2)}"

    def __repr__(self) -> str:
        return f"<LineaPedido #{self.id} - SKU: {self.codigo_rastreo_unico} Cant: {self.cantidad}>"


class HistorialPedido(Base):
    __tablename__ = "historial_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    estado_anterior = Column(String(50), nullable=True)
    estado_nuevo = Column(String(50), nullable=False)
    observacion = Column(String(300), nullable=True)
    fecha = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    pedido = relationship("Pedido", back_populates="historial")
    usuario = relationship("Usuario", lazy="selectin")

    def __repr__(self) -> str:
        return f"<HistorialPedido #{self.pedido_id}: {self.estado_anterior} -> {self.estado_nuevo}>"
