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


class Transportista(str, enum.Enum):
    MRW = "mrw"
    TEALCA = "tealca"
    ZOOM = "zoom"
    DOMESA = "domesa"
    DELIVERY_LOCAL = "delivery_local"
    RETIRO_TALLER = "retiro_taller"
    PARTICULAR = "particular"


class EstadoDespacho(str, enum.Enum):
    PREPARANDO = "preparando"
    EN_TRANSITO = "en_transito"
    ENTREGADO = "entregado"


class Despacho(Base):
    """
    Control de Despachos, Empaque y Notas de Entrega para el mercado textil venezolano.
    Asocia el pedido terminado con el transportista nacional o retiro en tienda,
    calcula valores duales (USD y Bs.) y emite la Nota de Entrega oficial.
    """
    __tablename__ = "despachos"

    id = Column(Integer, primary_key=True, index=True)
    numero_guia = Column(String(50), unique=True, nullable=False, index=True) # Ej: NE-0001
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="RESTRICT"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Datos de logística nacional
    transportista = Column(String(50), default="retiro_taller", nullable=False) # mrw, tealca, zoom, etc.
    tracking_externo = Column(String(100), nullable=True) # Número de cupón o guía del transportista
    bultos = Column(Integer, default=1, nullable=False)
    
    # Destinatario
    destinatario_nombre = Column(String(200), nullable=False)
    destinatario_cedula = Column(String(30), nullable=False) # V- o J-
    destinatario_telefono = Column(String(50), nullable=False)
    direccion_destino = Column(Text, nullable=False)
    ciudad_destino = Column(String(100), default="Caracas", nullable=False)

    # Datos financieros y de tasa en el momento del despacho
    fecha_despacho = Column(Date, default=date.today, nullable=False)
    tasa_cambio = Column(Numeric(14, 4), nullable=False) # Tasa BCV aplicada
    monto_total_usd = Column(Numeric(14, 2), nullable=False)
    monto_total_bs = Column(Numeric(14, 2), nullable=False)
    monto_saldo_pendiente_usd = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    monto_saldo_pendiente_bs = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)

    estado = Column(String(30), default="en_transito", nullable=False)
    notas = Column(Text, nullable=True)
    registrado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relaciones
    pedido = relationship("Pedido", lazy="selectin")
    cliente = relationship("Cliente", lazy="selectin")
    usuario = relationship("Usuario", foreign_keys=[registrado_por], lazy="selectin")
