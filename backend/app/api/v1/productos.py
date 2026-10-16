from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import RolUsuario, Usuario
from app.models.producto import Producto, TipoProducto, Variante
from app.schemas.producto import (
    ProductoCreate,
    ProductoOut,
    ProductoUpdate,
    VarianteCreate,
    VarianteOut,
    VarianteUpdate,
)

router = APIRouter(prefix="/productos", tags=["Catálogo & Productos"])


@router.get("", response_model=List[ProductoOut])
async def list_productos(
    tipo: Optional[TipoProducto] = Query(None, description="Filtrar por tipo de prenda"),
    q: Optional[str] = Query(None, description="Buscar por código o nombre"),
    solo_activos: bool = Query(True, description="Mostrar solo productos activos"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista productos del catálogo con sus variantes y stock."""
    query = select(Producto)
    if solo_activos:
        query = query.where(Producto.activo == True)
    if tipo:
        query = query.where(Producto.tipo == tipo)
    if q:
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                Producto.codigo.ilike(search),
                Producto.nombre.ilike(search),
                Producto.descripcion.ilike(search),
            )
        )

    query = query.order_by(Producto.nombre.asc())
    result = await db.execute(query)
    productos = result.scalars().all()
    return productos


@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
async def create_producto(
    prod_in: ProductoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Crea un nuevo producto en catálogo con sus variantes iniciales y generación de SKU único."""
    codigo_clean = prod_in.codigo.strip().upper()

    # Verificar código único
    cod_query = select(Producto).where(Producto.codigo == codigo_clean)
    cod_res = await db.execute(cod_query)
    if cod_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un producto con el código '{codigo_clean}'",
        )

    nuevo_producto = Producto(
        codigo=codigo_clean,
        nombre=prod_in.nombre.strip(),
        tipo=prod_in.tipo,
        descripcion=prod_in.descripcion.strip() if prod_in.descripcion else None,
        precio_base=prod_in.precio_base,
        imagen_url=prod_in.imagen_url,
        activo=prod_in.activo,
    )
    db.add(nuevo_producto)
    await db.flush()  # Para obtener el ID

    # Crear variantes iniciales si se proporcionaron
    skus_vistos = set()
    for var_in in prod_in.variantes_iniciales:
        sku = var_in.sku_unico.strip().upper() if var_in.sku_unico else Variante.generar_sku(
            codigo_clean, var_in.color, var_in.talla
        )

        if sku in skus_vistos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Variante duplicada con SKU '{sku}' en la misma creación",
            )
        skus_vistos.add(sku)

        # Chequear en BD si ya existe ese SKU
        check_sku = select(Variante).where(Variante.sku_unico == sku)
        if (await db.execute(check_sku)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El SKU '{sku}' ya está asignado a otra variante en el sistema",
            )

        nueva_var = Variante(
            producto_id=nuevo_producto.id,
            color=var_in.color.strip().capitalize(),
            talla=var_in.talla.strip().upper(),
            sku_unico=sku,
            stock=var_in.stock,
        )
        db.add(nueva_var)

    await db.commit()
    await db.refresh(nuevo_producto)
    return nuevo_producto


@router.get("/{producto_id}", response_model=ProductoOut)
async def get_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene el detalle de un producto por su ID junto con todas sus variantes."""
    query = select(Producto).where(Producto.id == producto_id)
    result = await db.execute(query)
    producto = result.scalar_one_or_none()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
    return producto


@router.put("/{producto_id}", response_model=ProductoOut)
async def update_producto(
    producto_id: int,
    prod_in: ProductoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Actualiza datos del producto."""
    query = select(Producto).where(Producto.id == producto_id)
    result = await db.execute(query)
    producto = result.scalar_one_or_none()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )

    if prod_in.codigo and prod_in.codigo.strip().upper() != producto.codigo:
        codigo_nuevo = prod_in.codigo.strip().upper()
        dup_query = select(Producto).where(
            Producto.codigo == codigo_nuevo,
            Producto.id != producto_id,
        )
        if (await db.execute(dup_query)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro producto con el código '{codigo_nuevo}'",
            )
        producto.codigo = codigo_nuevo

    update_data = prod_in.model_dump(exclude_unset=True)
    update_data.pop("codigo", None)

    for field, value in update_data.items():
        setattr(producto, field, value)

    await db.commit()
    await db.refresh(producto)
    return producto


@router.delete("/{producto_id}")
async def delete_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Desactiva un producto del catálogo."""
    query = select(Producto).where(Producto.id == producto_id)
    result = await db.execute(query)
    producto = result.scalar_one_or_none()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )

    producto.activo = False
    await db.commit()
    return {"status": "ok", "message": f"Producto '{producto.nombre}' desactivado"}


# ---------------- VARIANTES ---------------- #


@router.post("/{producto_id}/variantes", response_model=VarianteOut, status_code=status.HTTP_201_CREATED)
async def add_variante(
    producto_id: int,
    var_in: VarianteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Agrega una nueva variante (color + talla) a un producto garantizando SKU único."""
    query = select(Producto).where(Producto.id == producto_id)
    producto = (await db.execute(query)).scalar_one_or_none()
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )

    sku = var_in.sku_unico.strip().upper() if var_in.sku_unico else Variante.generar_sku(
        producto.codigo, var_in.color, var_in.talla
    )

    check_sku = select(Variante).where(Variante.sku_unico == sku)
    if (await db.execute(check_sku)).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una variante registrada con el SKU '{sku}'",
        )

    nueva_variante = Variante(
        producto_id=producto_id,
        color=var_in.color.strip().capitalize(),
        talla=var_in.talla.strip().upper(),
        sku_unico=sku,
        stock=var_in.stock,
    )
    db.add(nueva_variante)
    await db.commit()
    await db.refresh(nueva_variante)
    return nueva_variante


@router.put("/{producto_id}/variantes/{variante_id}", response_model=VarianteOut)
async def update_variante(
    producto_id: int,
    variante_id: int,
    var_in: VarianteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Actualiza stock o atributos de una variante."""
    query = select(Variante).where(
        Variante.id == variante_id,
        Variante.producto_id == producto_id,
    )
    variante = (await db.execute(query)).scalar_one_or_none()
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada para este producto",
        )

    if var_in.sku_unico and var_in.sku_unico.strip().upper() != variante.sku_unico:
        nuevo_sku = var_in.sku_unico.strip().upper()
        dup_query = select(Variante).where(
            Variante.sku_unico == nuevo_sku,
            Variante.id != variante_id,
        )
        if (await db.execute(dup_query)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El SKU '{nuevo_sku}' ya está en uso",
            )
        variante.sku_unico = nuevo_sku

    if var_in.color is not None:
        variante.color = var_in.color.strip().capitalize()
    if var_in.talla is not None:
        variante.talla = var_in.talla.strip().upper()
    if var_in.stock is not None:
        variante.stock = var_in.stock

    await db.commit()
    await db.refresh(variante)
    return variante


@router.delete("/{producto_id}/variantes/{variante_id}")
async def delete_variante(
    producto_id: int,
    variante_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Elimina una variante del producto."""
    query = select(Variante).where(
        Variante.id == variante_id,
        Variante.producto_id == producto_id,
    )
    variante = (await db.execute(query)).scalar_one_or_none()
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada",
        )

    await db.delete(variante)
    await db.commit()
    return {"status": "ok", "message": f"Variante SKU '{variante.sku_unico}' eliminada"}
