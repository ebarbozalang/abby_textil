from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.producto import TipoProducto


class VarianteBase(BaseModel):
    color: str = Field(..., min_length=1, max_length=50)
    talla: str = Field(..., min_length=1, max_length=20)
    stock: int = Field(default=0, ge=0)


class VarianteCreate(VarianteBase):
    sku_unico: Optional[str] = None  # Si no se envía, se autogenera


class VarianteUpdate(BaseModel):
    color: Optional[str] = None
    talla: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)
    sku_unico: Optional[str] = None


class VarianteOut(BaseModel):
    id: int
    producto_id: int
    color: str
    talla: str
    sku_unico: str
    stock: int

    model_config = ConfigDict(from_attributes=True)


class ProductoBase(BaseModel):
    codigo: str = Field(..., min_length=2, max_length=50)
    nombre: str = Field(..., min_length=2, max_length=150)
    tipo: TipoProducto = TipoProducto.CASUAL
    descripcion: Optional[str] = None
    precio_base: Decimal = Field(default=Decimal("0.00"), ge=0)
    imagen_url: Optional[str] = None
    activo: bool = True


class ProductoCreate(ProductoBase):
    variantes_iniciales: List[VarianteCreate] = []


class ProductoUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    tipo: Optional[TipoProducto] = None
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = Field(None, ge=0)
    imagen_url: Optional[str] = None
    activo: Optional[bool] = None


class ProductoOut(ProductoBase):
    id: int
    creado_en: datetime
    variantes: List[VarianteOut] = []

    model_config = ConfigDict(from_attributes=True)
