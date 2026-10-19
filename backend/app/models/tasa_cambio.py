from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, Numeric, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class TasaCambio(Base):
    """
    Registro y control de la tasa de cambio oficial (BCV o manual)
    entre el Dólar Estadounidense (USD) y el Bolívar Venezolano (VES/Bs.).
    """
    __tablename__ = "tasas_cambio"

    id = Column(Integer, primary_key=True, index=True)
    tasa = Column(Numeric(14, 4), nullable=False)  # Ej: 881.0664 Bs / USD
    fuente = Column(String(50), default="bcv", nullable=False)  # 'bcv_dolarapi', 'bcv_directo', 'manual'
    activa = Column(Boolean, default=True, nullable=False, index=True)
    fecha_actualizacion = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    actualizado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    usuario = relationship("Usuario", foreign_keys=[actualizado_por], lazy="selectin")

    def __repr__(self) -> str:
        return f"<TasaCambio #{self.id} {self.tasa} Bs/$ ({self.fuente}) Activa: {self.activa}>"
