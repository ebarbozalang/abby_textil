from typing import List, Optional
from decimal import Decimal
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import RolUsuario, Usuario
from app.models.trabajador import Trabajador
from app.models.pedido import Pedido, LineaPedido, EstadoPedido, HistorialPedido
from app.models.produccion import (
    OrdenCorte,
    OrdenImpresion,
    OrdenConfeccion,
    EstadoEtapaProduccion,
    EtapaImpresion,
)
from app.schemas.produccion import (
    OrdenCorteCreate,
    OrdenCorteOut,
    OrdenImpresionCreate,
    OrdenImpresionOut,
    OrdenConfeccionCreate,
    OrdenConfeccionOut,
    TableroProduccionOut,
    EscanearQrRequest,
    EscanearQrResponse,
)

router = APIRouter(prefix="/produccion", tags=["Producción"])


@router.get("/tablero", response_model=TableroProduccionOut)
async def get_tablero_produccion(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Retorna el tablero Kanban completo con las órdenes de Corte, Impresión y Confección activas.
    """
    # 1. Órdenes de Corte
    q_corte = (
        select(OrdenCorte)
        .options(
            selectinload(OrdenCorte.cortador),
            selectinload(OrdenCorte.linea_pedido).selectinload(LineaPedido.variante),
        )
        .order_by(OrdenCorte.id.desc())
    )
    cortes = (await db.execute(q_corte)).scalars().all()

    # 2. Órdenes de Impresión
    q_imp = (
        select(OrdenImpresion)
        .options(
            selectinload(OrdenImpresion.tecnico),
            selectinload(OrdenImpresion.linea_pedido).selectinload(LineaPedido.variante),
        )
        .order_by(OrdenImpresion.id.desc())
    )
    impresiones = (await db.execute(q_imp)).scalars().all()

    # 3. Órdenes de Confección
    q_conf = (
        select(OrdenConfeccion)
        .options(
            selectinload(OrdenConfeccion.operador),
            selectinload(OrdenConfeccion.linea_pedido).selectinload(LineaPedido.variante),
        )
        .order_by(OrdenConfeccion.id.desc())
    )
    confecciones = (await db.execute(q_conf)).scalars().all()

    return TableroProduccionOut(
        corte=cortes,
        impresion=impresiones,
        confeccion=confecciones,
    )


# ============================== ETAPA 1: CORTE ==============================


@router.post("/corte", response_model=OrdenCorteOut, status_code=status.HTTP_201_CREATED)
async def create_orden_corte(
    orden_in: OrdenCorteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO, RolUsuario.VENDEDOR)
    ),
):
    """
    Inicia la etapa de Corte para una línea de pedido.
    Regla: El pedido no puede estar en borrador (requiere anticipo mínimo validado).
    """
    linea_q = (
        select(LineaPedido)
        .where(LineaPedido.id == orden_in.linea_pedido_id)
        .options(selectinload(LineaPedido.pedido), selectinload(LineaPedido.variante))
    )
    linea = (await db.execute(linea_q)).scalar_one_or_none()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea de pedido no encontrada")

    if linea.pedido.estado == EstadoPedido.BORRADOR:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Bloqueo de Producción: El pedido #{linea.pedido.id} está en BORRADOR por anticipo insuficiente "
                f"({linea.pedido.porcentaje_anticipo:.1f}% abonado). Se requiere mínimo el 30% para iniciar el corte."
            ),
        )

    # Validar cortador
    cortador_q = select(Trabajador).where(Trabajador.id == orden_in.cortador_id)
    cortador = (await db.execute(cortador_q)).scalar_one_or_none()
    if not cortador or not cortador.activo:
        raise HTTPException(status_code=400, detail="Cortador no encontrado o inactivo")

    total = Decimal(str(orden_in.cantidad_piezas)) * Decimal(str(orden_in.costo_unitario))
    orden = OrdenCorte(
        pedido_id=linea.pedido_id,
        linea_pedido_id=linea.id,
        cortador_id=cortador.id,
        fecha=date.today(),
        cantidad_piezas=orden_in.cantidad_piezas,
        costo_unitario=orden_in.costo_unitario,
        total=total,
        estado=EstadoEtapaProduccion.EN_PROCESO,
        observaciones=orden_in.observaciones,
    )
    db.add(orden)

    # Actualizar estado de producción de la línea y pedido
    linea.estado_produccion = "en_corte"
    if linea.pedido.estado in [EstadoPedido.CONFIRMADO, EstadoPedido.PENDIENTE_CORTE]:
        linea.pedido.estado = EstadoPedido.EN_CORTE
        hist = HistorialPedido(
            pedido_id=linea.pedido_id,
            usuario_id=current_user.id,
            estado_anterior="pendiente_corte",
            estado_nuevo="en_corte",
            observacion=f"Orden de corte iniciada para {linea.codigo_rastreo_unico}",
        )
        db.add(hist)

    await db.commit()

    q_ret = (
        select(OrdenCorte)
        .where(OrdenCorte.id == orden.id)
        .options(
            selectinload(OrdenCorte.cortador),
            selectinload(OrdenCorte.linea_pedido).selectinload(LineaPedido.variante),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


@router.put("/corte/{orden_id}/terminar", response_model=OrdenCorteOut)
async def terminar_orden_corte(
    orden_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Marca la orden de corte como terminada, habilitando las etapas posteriores (Impresión o Confección)."""
    q = (
        select(OrdenCorte)
        .where(OrdenCorte.id == orden_id)
        .options(selectinload(OrdenCorte.linea_pedido))
    )
    orden = (await db.execute(q)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de corte no encontrada")

    orden.estado = EstadoEtapaProduccion.TERMINADO
    orden.linea_pedido.estado_produccion = "corte_terminado"

    await db.commit()

    q_ret = (
        select(OrdenCorte)
        .where(OrdenCorte.id == orden.id)
        .options(
            selectinload(OrdenCorte.cortador),
            selectinload(OrdenCorte.linea_pedido).selectinload(LineaPedido.variante),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


# ============================== ETAPA 2: IMPRESIÓN ==============================


@router.post("/impresion", response_model=OrdenImpresionOut, status_code=status.HTTP_201_CREATED)
async def create_orden_impresion(
    orden_in: OrdenImpresionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO, RolUsuario.VENDEDOR)
    ),
):
    """
    Registra orden de impresión (DTF, Sublimación, Bordado, etc.).
    Regla: Si es 'antes_costura', el corte de esa línea DEBE estar terminado.
    """
    linea_q = select(LineaPedido).where(LineaPedido.id == orden_in.linea_pedido_id)
    linea = (await db.execute(linea_q)).scalar_one_or_none()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea de pedido no encontrada")

    if orden_in.etapa == EtapaImpresion.ANTES_COSTURA:
        # Validar que corte esté terminado
        q_corte = select(OrdenCorte).where(
            and_(
                OrdenCorte.linea_pedido_id == linea.id,
                OrdenCorte.estado == EstadoEtapaProduccion.TERMINADO,
            )
        )
        corte_terminado = (await db.execute(q_corte)).scalar_one_or_none()
        if not corte_terminado:
            raise HTTPException(
                status_code=400,
                detail="Bloqueo Secuencial: No se puede iniciar impresión 'antes de costura' sin haber terminado el corte de las piezas",
            )

    tecnico_q = select(Trabajador).where(Trabajador.id == orden_in.tecnico_id)
    tecnico = (await db.execute(tecnico_q)).scalar_one_or_none()
    if not tecnico or not tecnico.activo:
        raise HTTPException(status_code=400, detail="Técnico no encontrado o inactivo")

    total = Decimal(str(orden_in.cantidad)) * Decimal(str(orden_in.costo_unitario))
    orden = OrdenImpresion(
        pedido_id=linea.pedido_id,
        linea_pedido_id=linea.id,
        tecnico_id=tecnico.id,
        tecnica=orden_in.tecnica,
        fecha=date.today(),
        cantidad=orden_in.cantidad,
        costo_unitario=orden_in.costo_unitario,
        total=total,
        etapa=orden_in.etapa,
        estado=EstadoEtapaProduccion.EN_PROCESO,
        observaciones=orden_in.observaciones,
    )
    db.add(orden)
    linea.estado_produccion = f"en_impresion_{orden_in.tecnica.value}"
    await db.commit()

    q_ret = (
        select(OrdenImpresion)
        .where(OrdenImpresion.id == orden.id)
        .options(
            selectinload(OrdenImpresion.tecnico),
            selectinload(OrdenImpresion.linea_pedido).selectinload(LineaPedido.variante),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


@router.put("/impresion/{orden_id}/terminar", response_model=OrdenImpresionOut)
async def terminar_orden_impresion(
    orden_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Marca la orden de impresión como terminada."""
    q = (
        select(OrdenImpresion)
        .where(OrdenImpresion.id == orden_id)
        .options(selectinload(OrdenImpresion.linea_pedido))
    )
    orden = (await db.execute(q)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de impresión no encontrada")

    orden.estado = EstadoEtapaProduccion.TERMINADO
    orden.linea_pedido.estado_produccion = "impresion_terminada"
    await db.commit()

    q_ret = (
        select(OrdenImpresion)
        .where(OrdenImpresion.id == orden.id)
        .options(
            selectinload(OrdenImpresion.tecnico),
            selectinload(OrdenImpresion.linea_pedido).selectinload(LineaPedido.variante),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


# ============================== ETAPA 3: CONFECCIÓN ==============================


@router.post("/confeccion", response_model=OrdenConfeccionOut, status_code=status.HTTP_201_CREATED)
async def create_orden_confeccion(
    orden_in: OrdenConfeccionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO, RolUsuario.VENDEDOR)
    ),
):
    """
    Inicia la etapa de Confección.
    Regla estricta:
    1. El corte de esa línea DEBE estar terminado.
    2. Si existió orden de impresión 'antes_costura', DEBE estar terminada.
    """
    linea_q = (
        select(LineaPedido)
        .where(LineaPedido.id == orden_in.linea_pedido_id)
        .options(selectinload(LineaPedido.pedido))
    )
    linea = (await db.execute(linea_q)).scalar_one_or_none()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea de pedido no encontrada")

    # 1. Verificar corte terminado
    corte_q = select(OrdenCorte).where(
        and_(
            OrdenCorte.linea_pedido_id == linea.id,
            OrdenCorte.estado == EstadoEtapaProduccion.TERMINADO,
        )
    )
    if not (await db.execute(corte_q)).scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=(
                f"Bloqueo Secuencial: La prenda '{linea.codigo_rastreo_unico}' no ha completado "
                f"la etapa de Corte. No puede pasar a Confección."
            ),
        )

    # 2. Verificar impresión 'antes_costura' terminada (si hubo)
    imp_q = select(OrdenImpresion).where(
        and_(
            OrdenImpresion.linea_pedido_id == linea.id,
            OrdenImpresion.etapa == EtapaImpresion.ANTES_COSTURA,
            OrdenImpresion.estado != EstadoEtapaProduccion.TERMINADO,
        )
    )
    if (await db.execute(imp_q)).scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Bloqueo Secuencial: La prenda tiene una orden de impresión/bordado previa a la costura pendiente por terminar.",
        )

    operador_q = select(Trabajador).where(Trabajador.id == orden_in.operador_id)
    operador = (await db.execute(operador_q)).scalar_one_or_none()
    if not operador or not operador.activo:
        raise HTTPException(status_code=400, detail="Operador no encontrado o inactivo")

    total = Decimal(str(orden_in.cantidad_prendas)) * Decimal(str(orden_in.costo_unitario))
    orden = OrdenConfeccion(
        pedido_id=linea.pedido_id,
        linea_pedido_id=linea.id,
        operador_id=operador.id,
        fecha=date.today(),
        cantidad_prendas=orden_in.cantidad_prendas,
        costo_unitario=orden_in.costo_unitario,
        total=total,
        estado=EstadoEtapaProduccion.EN_PROCESO,
        observaciones=orden_in.observaciones,
    )
    db.add(orden)
    linea.estado_produccion = "en_confeccion"

    if linea.pedido.estado != EstadoPedido.EN_CONFECCION:
        linea.pedido.estado = EstadoPedido.EN_CONFECCION
        hist = HistorialPedido(
            pedido_id=linea.pedido_id,
            usuario_id=current_user.id,
            estado_anterior="en_corte",
            estado_nuevo="en_confeccion",
            observacion=f"Confección iniciada para {linea.codigo_rastreo_unico}",
        )
        db.add(hist)

    await db.commit()

    q_ret = (
        select(OrdenConfeccion)
        .where(OrdenConfeccion.id == orden.id)
        .options(
            selectinload(OrdenConfeccion.operador),
            selectinload(OrdenConfeccion.linea_pedido).selectinload(LineaPedido.variante),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


@router.put("/confeccion/{orden_id}/terminar", response_model=OrdenConfeccionOut)
async def terminar_orden_confeccion(
    orden_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Marca la orden de confección como terminada y evalúa si el pedido pasa a control de calidad."""
    q = (
        select(OrdenConfeccion)
        .where(OrdenConfeccion.id == orden_id)
        .options(
            selectinload(OrdenConfeccion.linea_pedido).selectinload(LineaPedido.pedido).selectinload(Pedido.lineas)
        )
    )
    orden = (await db.execute(q)).scalar_one_or_none()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de confección no encontrada")

    orden.estado = EstadoEtapaProduccion.TERMINADO
    orden.linea_pedido.estado_produccion = "confeccion_terminada"

    # Verificar si todas las líneas del pedido completaron confección
    pedido = orden.linea_pedido.pedido
    todas_terminadas = all(l.estado_produccion == "confeccion_terminada" for l in pedido.lineas)

    if todas_terminadas:
        pedido.estado = EstadoPedido.CONTROL_CALIDAD
        hist = HistorialPedido(
            pedido_id=pedido.id,
            usuario_id=current_user.id,
            estado_anterior="en_confeccion",
            estado_nuevo=EstadoPedido.CONTROL_CALIDAD.value,
            observacion="Todas las prendas confeccionadas. Pedido avanza a Control de Calidad.",
        )
        db.add(hist)

    await db.commit()

    q_ret = (
        select(OrdenConfeccion)
        .where(OrdenConfeccion.id == orden.id)
        .options(
            selectinload(OrdenConfeccion.operador),
            selectinload(OrdenConfeccion.linea_pedido).selectinload(LineaPedido.variante),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


# ============================== ESCANEO QR RÁPIDO ==============================


@router.post("/escanear-qr", response_model=EscanearQrResponse)
async def escanear_qr_produccion(
    req: EscanearQrRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Endpoint rápido para escanear el QR físico o ingresar el código de rastreo único
    desde los puestos de trabajo (máquinas de corte, mesas de impresión, talleres de confección).
    Avanza la etapa automáticamente según la secuencia.
    """
    codigo = req.codigo_rastreo_unico.strip().upper()
    linea_q = (
        select(LineaPedido)
        .where(LineaPedido.codigo_rastreo_unico == codigo)
        .options(selectinload(LineaPedido.pedido), selectinload(LineaPedido.variante))
    )
    linea = (await db.execute(linea_q)).scalar_one_or_none()
    if not linea:
        raise HTTPException(
            status_code=404,
            detail=f"Prenda con código de rastreo '{codigo}' no encontrada",
        )

    # Validar trabajador
    trabajador = (await db.execute(select(Trabajador).where(Trabajador.id == req.trabajador_id))).scalar_one_or_none()
    if not trabajador:
        raise HTTPException(status_code=400, detail="Trabajador no encontrado")

    estado_linea = linea.estado_produccion

    # Si está pendiente de corte -> crear y terminar corte
    if estado_linea in ["pendiente_corte", "en_corte"]:
        costo = req.costo_unitario or Decimal("1500.00")
        total = Decimal(str(linea.cantidad)) * costo

        orden_c = OrdenCorte(
            pedido_id=linea.pedido_id,
            linea_pedido_id=linea.id,
            cortador_id=trabajador.id,
            fecha=date.today(),
            cantidad_piezas=linea.cantidad,
            costo_unitario=costo,
            total=total,
            estado=EstadoEtapaProduccion.TERMINADO,
            observaciones=f"Registrado por escaneo QR de {trabajador.nombre}",
        )
        db.add(orden_c)
        linea.estado_produccion = "corte_terminado"
        await db.commit()

        return EscanearQrResponse(
            status="ok",
            mensaje=f"Corte completado para {linea.cantidad} piezas de {linea.variante.sku_unico}",
            codigo_rastreo_unico=codigo,
            pedido_id=linea.pedido_id,
            linea_id=linea.id,
            etapa_completada="Corte",
            siguiente_etapa="Confección / Impresión",
            monto_generado=total,
        )

    # Si corte está terminado -> registrar confección
    elif estado_linea in ["corte_terminado", "impresion_terminada", "en_confeccion"]:
        costo = req.costo_unitario or Decimal("5000.00")
        total = Decimal(str(linea.cantidad)) * costo

        orden_conf = OrdenConfeccion(
            pedido_id=linea.pedido_id,
            linea_pedido_id=linea.id,
            operador_id=trabajador.id,
            fecha=date.today(),
            cantidad_prendas=linea.cantidad,
            costo_unitario=costo,
            total=total,
            estado=EstadoEtapaProduccion.TERMINADO,
            observaciones=f"Registrado por escaneo QR de {trabajador.nombre}",
        )
        db.add(orden_conf)
        linea.estado_produccion = "confeccion_terminada"

        # Validar si el pedido avanza a control de calidad
        pedido_q = (
            select(Pedido)
            .where(Pedido.id == linea.pedido_id)
            .options(selectinload(Pedido.lineas))
        )
        pedido = (await db.execute(pedido_q)).scalar_one()
        if all(l.estado_produccion == "confeccion_terminada" for l in pedido.lineas):
            pedido.estado = EstadoPedido.CONTROL_CALIDAD

        await db.commit()

        return EscanearQrResponse(
            status="ok",
            mensaje=f"Confección completada para {linea.cantidad} prendas de {linea.variante.sku_unico}",
            codigo_rastreo_unico=codigo,
            pedido_id=linea.pedido_id,
            linea_id=linea.id,
            etapa_completada="Confección",
            siguiente_etapa="Control de Calidad",
            monto_generado=total,
        )

    else:
        return EscanearQrResponse(
            status="info",
            mensaje=f"La prenda ya se encuentra en estado '{estado_linea}'",
            codigo_rastreo_unico=codigo,
            pedido_id=linea.pedido_id,
            linea_id=linea.id,
            etapa_completada=estado_linea,
            siguiente_etapa="Finalizada",
            monto_generado=Decimal("0.00"),
        )
