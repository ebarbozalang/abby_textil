from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime
from app.core.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, index=True)
    documento = Column(String(50), unique=True, index=True, nullable=False)
    telefono = Column(String(50), nullable=True)
    direccion = Column(String(200), nullable=True)
    email = Column(String(150), nullable=True)
    credito_maximo = Column(Numeric(14, 2), default=0.00, nullable=False)
    saldo_pendiente_global = Column(Numeric(14, 2), default=0.00, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def credito_disponible(self) -> float:
        """Calcula el crédito aún disponible antes de superar el límite."""
        return float(self.credito_maximo - self.saldo_pendiente_global)

    @property
    def excede_credito(self) -> bool:
        """Determina si el cliente ha superado su límite de crédito asignado."""
        return float(self.saldo_pendiente_global) > float(self.credito_maximo)

    def __repr__(self) -> str:
        return f"<Cliente {self.nombre} ({self.documento}) - Saldo: {self.saldo_pendiente_global}>"
