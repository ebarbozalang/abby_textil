import enum
from datetime import date
from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class TipoPago(str, enum.Enum):
    FIJO = "fijo"
    PRODUCCION = "produccion"
    MIXTO = "mixto"


class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, unique=True)
    nombre = Column(String(120), nullable=False)
    documento = Column(String(50), unique=True, index=True, nullable=False)
    telefono = Column(String(30), nullable=True)
    tipo_pago = Column(SQLEnum(TipoPago), default=TipoPago.PRODUCCION, nullable=False)
    salario_fijo = Column(Numeric(12, 2), default=0.00, nullable=False)
    fecha_ingreso = Column(Date, default=date.today, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    # Relación bidireccional con usuario
    usuario = relationship("Usuario", back_populates="trabajador")

    def __repr__(self) -> str:
        return f"<Trabajador {self.nombre} ({self.documento}) - {self.tipo_pago.value}>"
