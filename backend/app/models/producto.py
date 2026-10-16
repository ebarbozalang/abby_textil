import enum
import re
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class TipoProducto(str, enum.Enum):
    CONJUNTO_DAMA = "conjunto_dama"
    CONJUNTO_NINO = "conjunto_nino"
    CONJUNTO_CABALLERO = "conjunto_caballero"
    DEPORTIVA = "deportiva"
    CASUAL = "casual"
    CAMISA = "camisa"
    PANTALON = "pantalon"
    BOLSO = "bolso"
    OTRO = "otro"


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(150), nullable=False, index=True)
    tipo = Column(SQLEnum(TipoProducto), default=TipoProducto.CASUAL, nullable=False)
    descripcion = Column(String(500), nullable=True)
    precio_base = Column(Numeric(12, 2), default=0.00, nullable=False)
    imagen_url = Column(String(300), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relación uno a muchos con variantes
    variantes = relationship(
        "Variante",
        back_populates="producto",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Producto {self.codigo} - {self.nombre} (${self.precio_base})>"


class Variante(Base):
    __tablename__ = "variantes"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False, index=True)
    color = Column(String(50), nullable=False)
    talla = Column(String(20), nullable=False)
    sku_unico = Column(String(100), unique=True, index=True, nullable=False)
    stock = Column(Integer, default=0, nullable=False)

    # Relación bidireccional con producto
    producto = relationship("Producto", back_populates="variantes")

    @classmethod
    def generar_sku(cls, codigo_producto: str, color: str, talla: str) -> str:
        """
        Genera un SKU único estandarizado para evitar confusiones en producción:
        Ejemplo: Producto 'CAM', Color 'Rojo', Talla 'M' -> 'CAM-ROJ-M'
        """
        cod = re.sub(r"[^A-Za-z0-9]", "", codigo_producto).upper()
        col = re.sub(r"[^A-Za-z0-9]", "", color).upper()[:3]
        tal = re.sub(r"[^A-Za-z0-9]", "", talla).upper()
        return f"{cod}-{col}-{tal}"

    def __repr__(self) -> str:
        return f"<Variante SKU: {self.sku_unico} (Color: {self.color}, Talla: {self.talla}, Stock: {self.stock})>"
