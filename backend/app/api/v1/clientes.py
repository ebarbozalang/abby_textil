from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import RolUsuario, Usuario
from app.models.cliente import Cliente
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.get("", response_model=List[ClienteOut])
async def list_clientes(
    q: Optional[str] = Query(None, description="Búsqueda por nombre, documento o teléfono"),
    solo_activos: bool = Query(True, description="Filtrar solo clientes activos"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista todos los clientes con soporte para búsqueda en tiempo real."""
    query = select(Cliente)
    if solo_activos:
        query = query.where(Cliente.activo == True)

    if q:
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                Cliente.nombre.ilike(search),
                Cliente.documento.ilike(search),
                Cliente.telefono.ilike(search),
                Cliente.email.ilike(search),
            )
        )

    query = query.order_by(Cliente.nombre.asc())
    result = await db.execute(query)
    clientes = result.scalars().all()
    return clientes


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
async def create_cliente(
    cliente_in: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Crea un nuevo cliente validando que el documento no esté duplicado."""
    # Verificar documento único
    doc_query = select(Cliente).where(Cliente.documento == cliente_in.documento.strip())
    doc_res = await db.execute(doc_query)
    if doc_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un cliente registrado con el documento '{cliente_in.documento}'",
        )

    nuevo_cliente = Cliente(
        nombre=cliente_in.nombre.strip(),
        documento=cliente_in.documento.strip(),
        telefono=cliente_in.telefono.strip() if cliente_in.telefono else None,
        direccion=cliente_in.direccion.strip() if cliente_in.direccion else None,
        email=str(cliente_in.email).strip().lower() if cliente_in.email else None,
        credito_maximo=cliente_in.credito_maximo,
        saldo_pendiente_global=0.00,
        activo=cliente_in.activo,
    )

    db.add(nuevo_cliente)
    await db.commit()
    await db.refresh(nuevo_cliente)
    return nuevo_cliente


@router.get("/{cliente_id}", response_model=ClienteOut)
async def get_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene el detalle de un cliente por su ID."""
    query = select(Cliente).where(Cliente.id == cliente_id)
    result = await db.execute(query)
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado",
        )
    return cliente


@router.put("/{cliente_id}", response_model=ClienteOut)
async def update_cliente(
    cliente_id: int,
    cliente_in: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Actualiza la información y cupo de crédito del cliente."""
    query = select(Cliente).where(Cliente.id == cliente_id)
    result = await db.execute(query)
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado",
        )

    # Si se actualiza el documento, validar que no exista en otro cliente
    if cliente_in.documento and cliente_in.documento.strip() != cliente.documento:
        dup_query = select(Cliente).where(
            Cliente.documento == cliente_in.documento.strip(),
            Cliente.id != cliente_id,
        )
        dup_res = await db.execute(dup_query)
        if dup_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro cliente con el documento '{cliente_in.documento}'",
            )
        cliente.documento = cliente_in.documento.strip()

    update_data = cliente_in.model_dump(exclude_unset=True)
    update_data.pop("documento", None)  # Ya manejado

    for field, value in update_data.items():
        setattr(cliente, field, value)

    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}")
async def delete_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Desactiva lógicamente al cliente para preservar integridad referencial."""
    query = select(Cliente).where(Cliente.id == cliente_id)
    result = await db.execute(query)
    cliente = result.scalar_one_or_none()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado",
        )

    cliente.activo = False
    await db.commit()
    return {"status": "ok", "message": f"Cliente '{cliente.nombre}' desactivado exitosamente"}
