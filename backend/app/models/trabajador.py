import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Enum as SQLEnum,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class TipoPago(str, enum.Enum):
    FIJO = "fijo"
    PRODUCCION = "produccion"
    MIXTO = "mixto"


class EstadoNomina(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"


class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, unique=True)
    nombre = Column(String(120), nullable=False, index=True)
    documento = Column(String(50), unique=True, index=True, nullable=False)
    telefono = Column(String(30), nullable=True)
    tipo_pago = Column(SQLEnum(TipoPago), default=TipoPago.PRODUCCION, nullable=False)
    salario_fijo = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    fecha_ingreso = Column(Date, default=date.today, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relación bidireccional con usuario y nóminas
    usuario = relationship("Usuario", back_populates="trabajador")
    nominas = relationship("Nomina", back_populates="trabajador", cascade="all, delete-orphan", lazy="selectin")
    registros_produccion = relationship("ProduccionDiaria", back_populates="trabajador", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Trabajador {self.nombre} ({self.documento}) - {self.tipo_pago.value}>"


class Nomina(Base):
    __tablename__ = "nomina"

    id = Column(Integer, primary_key=True, index=True)
    trabajador_id = Column(Integer, ForeignKey("trabajadores.id", ondelete="CASCADE"), nullable=False, index=True)
    periodo_inicio = Column(Date, nullable=False)
    periodo_fin = Column(Date, nullable=False)
    tipo = Column(SQLEnum(TipoPago), nullable=False)
    total_producido = Column(Integer, default=0, nullable=False)  # Cantidad total de piezas/prendas
    monto_fijo = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    monto_produccion = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total = Column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    estado = Column(SQLEnum(EstadoNomina), default=EstadoNomina.PENDIENTE, nullable=False, index=True)
    fecha_pago = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relación
    trabajador = relationship("Trabajador", back_populates="nominas")

    def __repr__(self) -> str:
        return f"<Nomina #{self.id} Trabajador:{self.trabajador_id} Total:${self.total} ({self.estado.value})>"


class ProduccionDiaria(Base):
    __tablename__ = "produccion_diaria"

    id = Column(Integer, primary_key=True, index=True)
    trabajador_id = Column(Integer, ForeignKey("trabajadores.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, default=date.today, nullable=False, index=True)
    orden_tipo = Column(String(50), nullable=False)  # 'corte', 'impresion', 'confeccion'
    orden_id = Column(Integer, nullable=False)
    cantidad = Column(Integer, default=1, nullable=False)
    monto_generado = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relación
    trabajador = relationship("Trabajador", back_populates="registros_produccion")

    __table_args__ = (
        Index("idx_produccion_fecha", "trabajador_id", "fecha"),
    )

    def __repr__(self) -> str:
        return f"<ProduccionDiaria #{self.id} Trabajador:{self.trabajador_id} Fecha:{self.fecha} Cant:{self.cantidad} Monto:${self.monto_generado}>"
