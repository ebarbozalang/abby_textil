import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class RolUsuario(str, enum.Enum):
    VENDEDOR = "vendedor"
    ADMINISTRADOR = "administrador"
    SUPERUSUARIO = "superusuario"
    TRABAJADOR = "trabajador"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(SQLEnum(RolUsuario), default=RolUsuario.VENDEDOR, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relación con trabajador si aplica
    trabajador = relationship("Trabajador", back_populates="usuario", uselist=False, lazy="selectin")

    def __repr__(self) -> str:
        return f"<Usuario {self.email} ({self.rol.value})>"
