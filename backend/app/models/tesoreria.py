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


class MetodoPago(str, enum.Enum):
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"
    TARJETA = "tarjeta"
    DAVIPLATA = "daviplata"
    NEQUI = "nequi"
    OTRO = "otro"


class Pago(Base):
    """
    Registro de pagos directos aplicados a un pedido específico
    (anticipos para desbloqueo de producción o abonos a saldo de entrega).
    """
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    fecha = Column(Date, default=date.today, nullable=False, index=True)
    monto = Column(Numeric(14, 2), nullable=False)
    metodo = Column(SQLEnum(MetodoPago), default=MetodoPago.EFECTIVO, nullable=False)
    referencia = Column(String(100), nullable=True)
    registrado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    pedido = relationship("Pedido", lazy="selectin")
    cliente = relationship("Cliente", lazy="selectin")
    usuario_registro = relationship("Usuario", foreign_keys=[registrado_por], lazy="selectin")

    def __repr__(self) -> str:
        return f"<Pago #{self.id} Pedido #{self.pedido_id} Monto: {self.monto} Metodo: {self.metodo}>"


class AbonoCredito(Base):
    """
    Registro de abonos a la cuenta global de crédito de un cliente.
    Puede estar o no vinculado a un pedido específico.
    """
    __tablename__ = "abonos_credito"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="SET NULL"), nullable=True, index=True)
    fecha = Column(Date, default=date.today, nullable=False, index=True)
    monto = Column(Numeric(14, 2), nullable=False)
    metodo = Column(SQLEnum(MetodoPago), default=MetodoPago.EFECTIVO, nullable=False)
    referencia = Column(String(100), nullable=True)
    notas = Column(Text, nullable=True)
    registrado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    cliente = relationship("Cliente", lazy="selectin")
    pedido = relationship("Pedido", lazy="selectin")
    usuario_registro = relationship("Usuario", foreign_keys=[registrado_por], lazy="selectin")

    def __repr__(self) -> str:
        return f"<AbonoCredito #{self.id} Cliente #{self.cliente_id} Monto: {self.monto}>"
