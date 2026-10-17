from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import RolUsuario, Usuario
from app.models.trabajador import Trabajador, Nomina, ProduccionDiaria, TipoPago, EstadoNomina
from app.models.produccion import (
    OrdenCorte,
    OrdenImpresion,
    OrdenConfeccion,
    EstadoEtapaProduccion,
)
from app.schemas.trabajador import (
    TrabajadorCreate,
    TrabajadorOut,
    TrabajadorUpdate,
    ProduccionDiariaCreate,
    ProduccionDiariaOut,
    LiquidarNominaRequest,
    NominaOut,
)

router = APIRouter(prefix="/trabajadores", tags=["Trabajadores & Nómina"])


@router.get("", response_model=List[TrabajadorOut])
async def list_trabajadores(
    solo_activos: bool = Query(True, description="Mostrar solo trabajadores activos"),
    q: Optional[str] = Query(None, description="Buscar por nombre o documento"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista todos los trabajadores de la empresa textil."""
    query = select(Trabajador)
    if solo_activos:
        query = query.where(Trabajador.activo == True)
    if q:
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                Trabajador.nombre.ilike(search),
                Trabajador.documento.ilike(search),
            )
        )

    query = query.order_by(Trabajador.nombre.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TrabajadorOut, status_code=status.HTTP_201_CREATED)
async def create_trabajador(
    trabajador_in: TrabajadorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Registra un nuevo trabajador validando documento único."""
    doc_q = select(Trabajador).where(Trabajador.documento == trabajador_in.documento.strip())
    if (await db.execute(doc_q)).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un trabajador con el documento '{trabajador_in.documento}'",
        )

    nuevo = Trabajador(
        usuario_id=trabajador_in.usuario_id,
        nombre=trabajador_in.nombre.strip(),
        documento=trabajador_in.documento.strip(),
        telefono=trabajador_in.telefono.strip() if trabajador_in.telefono else None,
        tipo_pago=trabajador_in.tipo_pago,
        salario_fijo=trabajador_in.salario_fijo,
        fecha_ingreso=trabajador_in.fecha_ingreso,
        activo=trabajador_in.activo,
    )
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return nuevo


@router.get("/{trabajador_id}", response_model=TrabajadorOut)
async def get_trabajador(
    trabajador_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene los datos de un trabajador."""
    q = select(Trabajador).where(Trabajador.id == trabajador_id)
    trabajador = (await db.execute(q)).scalar_one_or_none()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    return trabajador


@router.put("/{trabajador_id}", response_model=TrabajadorOut)
async def update_trabajador(
    trabajador_id: int,
    trabajador_in: TrabajadorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Actualiza datos, modalidad de pago o salario base del trabajador."""
    q = select(Trabajador).where(Trabajador.id == trabajador_id)
    trabajador = (await db.execute(q)).scalar_one_or_none()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")

    if trabajador_in.documento and trabajador_in.documento.strip() != trabajador.documento:
        dup = select(Trabajador).where(
            Trabajador.documento == trabajador_in.documento.strip(),
            Trabajador.id != trabajador_id,
        )
        if (await db.execute(dup)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El documento ya está en uso por otro trabajador")
        trabajador.documento = trabajador_in.documento.strip()

    update_data = trabajador_in.model_dump(exclude_unset=True)
    update_data.pop("documento", None)

    for field, val in update_data.items():
        setattr(trabajador, field, val)

    await db.commit()
    await db.refresh(trabajador)
    return trabajador


@router.delete("/{trabajador_id}")
async def delete_trabajador(
    trabajador_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Desactiva un trabajador del sistema."""
    q = select(Trabajador).where(Trabajador.id == trabajador_id)
    trabajador = (await db.execute(q)).scalar_one_or_none()
    if not trabajador:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado")

    trabajador.activo = False
    await db.commit()
    return {"status": "ok", "message": f"Trabajador '{trabajador.nombre}' desactivado"}


# ============================== NÓMINA & LIQUIDACIÓN ==============================


@router.post("/liquidar-nomina", response_model=List[NominaOut])
async def liquidar_nomina_periodo(
    req: LiquidarNominaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """
    Calcula automáticamente la nómina para el rango de fechas dado.
    Suma las órdenes de producción terminadas (Corte, Impresión, Confección)
    según la modalidad de pago de cada trabajador (fijo, producción, mixto).
    """
    # 1. Obtener trabajadores a liquidar
    t_query = select(Trabajador).where(Trabajador.activo == True)
    if req.trabajador_id:
        t_query = t_query.where(Trabajador.id == req.trabajador_id)

    trabajadores = (await db.execute(t_query)).scalars().all()
    if not trabajadores:
        raise HTTPException(status_code=404, detail="No se encontraron trabajadores activos para liquidar")

    nominas_generadas = []

    for t in trabajadores:
        # Consultar órdenes terminadas en el periodo para este trabajador
        # a) Corte
        q_corte = select(OrdenCorte).where(
            and_(
                OrdenCorte.cortador_id == t.id,
                OrdenCorte.estado == EstadoEtapaProduccion.TERMINADO,
                OrdenCorte.fecha >= req.periodo_inicio,
                OrdenCorte.fecha <= req.periodo_fin,
            )
        )
        cortes = (await db.execute(q_corte)).scalars().all()

        # b) Impresión
        q_imp = select(OrdenImpresion).where(
            and_(
                OrdenImpresion.tecnico_id == t.id,
                OrdenImpresion.estado == EstadoEtapaProduccion.TERMINADO,
                OrdenImpresion.fecha >= req.periodo_inicio,
                OrdenImpresion.fecha <= req.periodo_fin,
            )
        )
        impresiones = (await db.execute(q_imp)).scalars().all()

        # c) Confección
        q_conf = select(OrdenConfeccion).where(
            and_(
                OrdenConfeccion.operador_id == t.id,
                OrdenConfeccion.estado == EstadoEtapaProduccion.TERMINADO,
                OrdenConfeccion.fecha >= req.periodo_inicio,
                OrdenConfeccion.fecha <= req.periodo_fin,
            )
        )
        confecciones = (await db.execute(q_conf)).scalars().all()

        # Calcular totales
        piezas_cortadas = sum(c.cantidad_piezas for c in cortes)
        monto_cortes = sum(c.total for c in cortes)

        piezas_impresas = sum(i.cantidad for i in impresiones)
        monto_impresiones = sum(i.total for i in impresiones)

        prendas_confeccionadas = sum(cf.cantidad_prendas for cf in confecciones)
        monto_confecciones = sum(cf.total for cf in confecciones)

        total_producido = piezas_cortadas + piezas_impresas + prendas_confeccionadas
        monto_produccion = monto_cortes + monto_impresiones + monto_confecciones

        # Regla según tipo de pago
        if t.tipo_pago == TipoPago.FIJO:
            monto_fijo = Decimal(str(t.salario_fijo))
            total_neto = monto_fijo
        elif t.tipo_pago == TipoPago.PRODUCCION:
            monto_fijo = Decimal("0.00")
            total_neto = Decimal(str(monto_produccion))
        elif t.tipo_pago == TipoPago.MIXTO:
            monto_fijo = Decimal(str(t.salario_fijo))
            total_neto = monto_fijo + Decimal(str(monto_produccion))
        else:
            monto_fijo = Decimal("0.00")
            total_neto = Decimal(str(monto_produccion))

        # Crear o actualizar nómina para este periodo
        q_exist = select(Nomina).where(
            and_(
                Nomina.trabajador_id == t.id,
                Nomina.periodo_inicio == req.periodo_inicio,
                Nomina.periodo_fin == req.periodo_fin,
            )
        )
        nomina = (await db.execute(q_exist)).scalar_one_or_none()

        if nomina:
            nomina.total_producido = total_producido
            nomina.monto_fijo = monto_fijo
            nomina.monto_produccion = monto_produccion
            nomina.total = total_neto
            nomina.tipo = t.tipo_pago
        else:
            nomina = Nomina(
                trabajador_id=t.id,
                periodo_inicio=req.periodo_inicio,
                periodo_fin=req.periodo_fin,
                tipo=t.tipo_pago,
                total_producido=total_producido,
                monto_fijo=monto_fijo,
                monto_produccion=monto_produccion,
                total=total_neto,
                estado=EstadoNomina.PENDIENTE,
            )
            db.add(nomina)

        await db.flush()
        nominas_generadas.append(nomina.id)

    await db.commit()

    # Cargar nóminas con trabajador
    q_all = (
        select(Nomina)
        .where(Nomina.id.in_(nominas_generadas))
        .options(selectinload(Nomina.trabajador))
    )
    res = await db.execute(q_all)
    return res.scalars().all()


@router.get("/nominas/historial", response_model=List[NominaOut])
async def list_nominas(
    estado: Optional[EstadoNomina] = Query(None, description="Filtrar por estado de pago"),
    trabajador_id: Optional[int] = Query(None, description="Filtrar por trabajador"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista las nóminas liquidadas con filtros."""
    query = select(Nomina).options(selectinload(Nomina.trabajador))
    if estado:
        query = query.where(Nomina.estado == estado)
    if trabajador_id:
        query = query.where(Nomina.trabajador_id == trabajador_id)

    query = query.order_by(Nomina.id.desc())
    res = await db.execute(query)
    return res.scalars().all()


@router.put("/nominas/{nomina_id}/pagar", response_model=NominaOut)
async def marcar_nomina_pagada(
    nomina_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """Marca una nómina como pagada registrando fecha de pago."""
    q = (
        select(Nomina)
        .where(Nomina.id == nomina_id)
        .options(selectinload(Nomina.trabajador))
    )
    nomina = (await db.execute(q)).scalar_one_or_none()
    if not nomina:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")

    nomina.estado = EstadoNomina.PAGADO
    nomina.fecha_pago = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(nomina)
    return nomina
