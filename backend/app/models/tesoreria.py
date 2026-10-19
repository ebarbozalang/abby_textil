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


class MonedaPago(str, enum.Enum):
    USD = "USD"
    BS = "BS"


class MetodoPago(str, enum.Enum):
    PAGO_MOVIL = "pago_movil"          # Pago Móvil en Bolívares
    EFECTIVO_USD = "efectivo_usd"      # Efectivo Dólares ($)
    EFECTIVO_BS = "efectivo_bs"        # Efectivo Bolívares (Bs.)
    TRANSFERENCIA_BS = "transferencia_bs" # Transferencia Bancaria en Bs. (Banesco, Mercantil, BDV, etc.)
    PUNTO_VENTA = "punto_venta"        # Tarjeta Débito / Biopago en Bs.
    ZELLE = "zelle"                    # Zelle en USD
    BINANCE = "binance"                # Binance Pay / USDT
    OTRO = "otro"                      # Zinli, Wally, etc.


class Pago(Base):
    """
    Registro de pagos de pedidos adaptado al mercado de Venezuela.
    Maneja montos tanto en Dólares (USD) como su conversión a Bolívares (Bs.)
    según la tasa del BCV o tasa acordada.
    """
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    fecha = Column(Date, default=date.today, nullable=False, index=True)

    # Montos en ambas monedas
    monto = Column(Numeric(14, 2), nullable=False) # Base USD para balance del pedido
    monto_usd = Column(Numeric(14, 2), nullable=False)
    monto_bs = Column(Numeric(16, 2), nullable=False, default=Decimal("0.00"))
    tasa_cambio = Column(Numeric(14, 4), nullable=False, default=Decimal("1.0000"))
    moneda_pago = Column(SQLEnum(MonedaPago), default=MonedaPago.USD, nullable=False)

    # Datos del pago venezolano
    metodo = Column(SQLEnum(MetodoPago), default=MetodoPago.EFECTIVO_USD, nullable=False)
    banco = Column(String(100), nullable=True) # Ej: Banesco, Mercantil, BDV
    telefono = Column(String(50), nullable=True) # Para Pago Móvil
    referencia = Column(String(100), nullable=True) # Nº comprobante / últimos 4 dígitos

    registrado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    pedido = relationship("Pedido", lazy="selectin")
    cliente = relationship("Cliente", lazy="selectin")
    usuario_registro = relationship("Usuario", foreign_keys=[registrado_por], lazy="selectin")

    def __repr__(self) -> str:
        return f"<Pago #{self.id} Pedido #{self.pedido_id} MontoUSD: ${self.monto_usd} (Bs. {self.monto_bs}) Metodo: {self.metodo}>"


class AbonoCredito(Base):
    """
    Registro de abonos a la cuenta global de crédito de un cliente.
    Permite abonos tanto en USD como en Bs. con registro de la tasa BCV.
    """
    __tablename__ = "abonos_credito"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="SET NULL"), nullable=True, index=True)
    fecha = Column(Date, default=date.today, nullable=False, index=True)

    # Montos en ambas monedas
    monto = Column(Numeric(14, 2), nullable=False) # Base USD
    monto_usd = Column(Numeric(14, 2), nullable=False)
    monto_bs = Column(Numeric(16, 2), nullable=False, default=Decimal("0.00"))
    tasa_cambio = Column(Numeric(14, 4), nullable=False, default=Decimal("1.0000"))
    moneda_pago = Column(SQLEnum(MonedaPago), default=MonedaPago.USD, nullable=False)

    # Datos del pago
    metodo = Column(SQLEnum(MetodoPago), default=MetodoPago.EFECTIVO_USD, nullable=False)
    banco = Column(String(100), nullable=True)
    telefono = Column(String(50), nullable=True)
    referencia = Column(String(100), nullable=True)
    notas = Column(Text, nullable=True)

    registrado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    cliente = relationship("Cliente", lazy="selectin")
    pedido = relationship("Pedido", lazy="selectin")
    usuario_registro = relationship("Usuario", foreign_keys=[registrado_por], lazy="selectin")

    def __repr__(self) -> str:
        return f"<AbonoCredito #{self.id} Cliente #{self.cliente_id} MontoUSD: ${self.monto_usd} (Bs. {self.monto_bs})>"
