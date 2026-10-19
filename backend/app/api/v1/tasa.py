from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario, RolUsuario
from app.models.tasa_cambio import TasaCambio
from app.schemas.tasa_cambio import TasaCambioOut, TasaManualRequest, TasaHistorialOut
from app.services.tasa_service import (
    obtener_tasa_actual,
    actualizar_tasa_desde_bcv,
    fijar_tasa_manual,
)

router = APIRouter(prefix="/tasa", tags=["Tasa de Cambio (BCV & USD/Bs)"])


@router.get("", response_model=TasaHistorialOut)
async def consultar_tasa(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Retorna la tasa de cambio activa (BCV o manual) y el historial reciente de cambios.
    Permite calcular precios y pagos en Bolívares (Bs.) y Dólares (USD).
    """
    tasa_activa = await obtener_tasa_actual(db)

    # Historial de las últimas 10 tasas
    historial_q = (
        select(TasaCambio)
        .order_by(desc(TasaCambio.fecha_actualizacion))
        .limit(10)
    )
    historial_res = await db.execute(historial_q)
    historial = historial_res.scalars().all()

    return TasaHistorialOut(
        tasa_actual=TasaCambioOut(
            id=tasa_activa.id,
            tasa=tasa_activa.tasa,
            fuente=tasa_activa.fuente,
            activa=tasa_activa.activa,
            fecha_actualizacion=tasa_activa.fecha_actualizacion,
            actualizado_por_nombre=tasa_activa.usuario.nombre if tasa_activa.usuario else "Sistema",
        ),
        historial=[
            TasaCambioOut(
                id=t.id,
                tasa=t.tasa,
                fuente=t.fuente,
                activa=t.activa,
                fecha_actualizacion=t.fecha_actualizacion,
                actualizado_por_nombre=t.usuario.nombre if t.usuario else "Sistema",
            )
            for t in historial
        ],
    )


@router.post(
    "/bcv",
    response_model=TasaCambioOut,
    dependencies=[Depends(require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO, RolUsuario.VENDEDOR))],
)
async def sincronizar_bcv(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Consulta en tiempo real la tasa oficial del Banco Central de Venezuela (BCV)
    y la establece como la tasa activa del sistema.
    """
    nueva_tasa = await actualizar_tasa_desde_bcv(db, usuario_id=current_user.id)
    return TasaCambioOut(
        id=nueva_tasa.id,
        tasa=nueva_tasa.tasa,
        fuente=nueva_tasa.fuente,
        activa=nueva_tasa.activa,
        fecha_actualizacion=nueva_tasa.fecha_actualizacion,
        actualizado_por_nombre=current_user.nombre,
    )


@router.post(
    "/manual",
    response_model=TasaCambioOut,
    dependencies=[Depends(require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))],
)
async def establecer_tasa_manual(
    payload: TasaManualRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Establece manualmente una tasa de cambio personalizada en Bolívares por Dólar (Bs/$).
    Útil cuando la empresa fija una tasa interna o si no hay conexión a internet.
    """
    try:
        nueva_tasa = await fijar_tasa_manual(db, payload.tasa, usuario_id=current_user.id)
        return TasaCambioOut(
            id=nueva_tasa.id,
            tasa=nueva_tasa.tasa,
            fuente=nueva_tasa.fuente,
            activa=nueva_tasa.activa,
            fecha_actualizacion=nueva_tasa.fecha_actualizacion,
            actualizado_por_nombre=current_user.nombre,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
