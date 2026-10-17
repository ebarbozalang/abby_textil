from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario, RolUsuario
from app.models.cliente import Cliente
from app.models.pedido import Pedido, EstadoPedido, HistorialPedido
from app.models.tesoreria import MetodoPago, Pago, AbonoCredito
from app.schemas.tesoreria import (
    PagoCreate,
    PagoOut,
    AbonoCreditoCreate,
    AbonoCreditoOut,
    MetodoResumen,
    MovimientoCajaItem,
    CierreCajaOut,
    CuentaPorCobrarOut,
)

router = APIRouter(prefix="/tesoreria", tags=["Tesorería & Cuentas por Cobrar"])


@router.post(
    "/pagos",
    response_model=PagoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role([RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]))],
)
async def registrar_pago_pedido(
    payload: PagoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Registra un pago para un pedido específico (anticipo o saldo).
    - Reduce el saldo pendiente del pedido.
    - Reduce el saldo pendiente global del cliente.
    - Si el pedido estaba en borrador y alcanza el 30% obligatorio, se desbloquea a 'pendiente_corte'.
    """
    if payload.monto <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto a pagar debe ser mayor a cero",
        )

    # 1. Obtener pedido con cliente
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.cliente))
        .where(Pedido.id == payload.pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido con ID {payload.pedido_id} no encontrado",
        )

    if pedido.estado == EstadoPedido.CANCELADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden registrar pagos a un pedido cancelado",
        )

    fecha_pago = payload.fecha or date.today()

    # 2. Crear registro de Pago
    nuevo_pago = Pago(
        pedido_id=pedido.id,
        cliente_id=pedido.cliente_id,
        fecha=fecha_pago,
        monto=payload.monto,
        metodo=payload.metodo,
        referencia=payload.referencia,
        registrado_por=current_user.id,
    )
    db.add(nuevo_pago)
    await db.flush()

    # 3. Actualizar valores en el pedido
    nuevo_anticipo_acumulado = Decimal(str(pedido.anticipo)) + payload.monto
    nuevo_saldo_pedido = max(Decimal("0.00"), Decimal(str(pedido.saldo_pendiente)) - payload.monto)

    pedido.anticipo = nuevo_anticipo_acumulado
    pedido.saldo_pendiente = nuevo_saldo_pedido

    # 4. Actualizar saldo global del cliente
    cliente = pedido.cliente
    if cliente:
        cliente.saldo_pendiente_global = max(
            Decimal("0.00"),
            Decimal(str(cliente.saldo_pendiente_global)) - payload.monto,
        )

    # 5. Regla de negocio: Desbloqueo a producción si el anticipo alcanza >= 30%
    minimo_anticipo = Decimal(str(pedido.total)) * Decimal("0.30")
    if pedido.estado == EstadoPedido.BORRADOR and nuevo_anticipo_acumulado >= minimo_anticipo:
        estado_previo = pedido.estado
        pedido.estado = EstadoPedido.PENDIENTE_CORTE

        historial = HistorialPedido(
            pedido_id=pedido.id,
            usuario_id=current_user.id,
            estado_anterior=estado_previo,
            estado_nuevo=EstadoPedido.PENDIENTE_CORTE,
            observacion=(
                f"Pago #{nuevo_pago.id} de ${payload.monto:,.2f} ({payload.metodo.value}). "
                f"Anticipo del 30% completado ({nuevo_anticipo_acumulado:,.2f}/{pedido.total:,.2f}). "
                f"Pedido desbloqueado a corte."
            ),
        )
        db.add(historial)
    else:
        historial = HistorialPedido(
            pedido_id=pedido.id,
            usuario_id=current_user.id,
            estado_anterior=pedido.estado,
            estado_nuevo=pedido.estado,
            observacion=(
                f"Pago #{nuevo_pago.id} registrado por ${payload.monto:,.2f} mediante {payload.metodo.value}. "
                f"Saldo restante del pedido: ${pedido.saldo_pendiente:,.2f}."
            ),
        )
        db.add(historial)

    await db.commit()
    await db.refresh(nuevo_pago)

    return PagoOut(
        id=nuevo_pago.id,
        pedido_id=nuevo_pago.pedido_id,
        cliente_id=nuevo_pago.cliente_id,
        fecha=nuevo_pago.fecha,
        monto=nuevo_pago.monto,
        metodo=nuevo_pago.metodo,
        referencia=nuevo_pago.referencia,
        registrado_por=nuevo_pago.registrado_por,
        creado_en=nuevo_pago.creado_en,
        cliente_nombre=cliente.nombre if cliente else "Cliente",
        registrado_por_nombre=current_user.nombre,
    )


@router.get(
    "/pagos",
    response_model=List[PagoOut],
    dependencies=[Depends(require_role([RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]))],
)
async def listar_pagos(
    pedido_id: Optional[int] = None,
    cliente_id: Optional[int] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    metodo: Optional[MetodoPago] = None,
    db: AsyncSession = Depends(get_db),
):
    """Lista pagos registrados con filtros opcionales."""
    query = (
        select(Pago)
        .options(
            selectinload(Pago.cliente),
            selectinload(Pago.usuario_registro),
        )
        .order_by(desc(Pago.fecha), desc(Pago.id))
    )

    if pedido_id:
        query = query.where(Pago.pedido_id == pedido_id)
    if cliente_id:
        query = query.where(Pago.cliente_id == cliente_id)
    if fecha_inicio:
        query = query.where(Pago.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.where(Pago.fecha <= fecha_fin)
    if metodo:
        query = query.where(Pago.metodo == metodo)

    result = await db.execute(query)
    pagos = result.scalars().all()

    return [
        PagoOut(
            id=p.id,
            pedido_id=p.pedido_id,
            cliente_id=p.cliente_id,
            fecha=p.fecha,
            monto=p.monto,
            metodo=p.metodo,
            referencia=p.referencia,
            registrado_por=p.registrado_por,
            creado_en=p.creado_en,
            cliente_nombre=p.cliente.nombre if p.cliente else "Desconocido",
            registrado_por_nombre=p.usuario_registro.nombre if p.usuario_registro else None,
        )
        for p in pagos
    ]


@router.post(
    "/abonos",
    response_model=AbonoCreditoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role([RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]))],
)
async def registrar_abono_credito(
    payload: AbonoCreditoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Registra un abono a la cuenta de crédito global del cliente.
    Opcionalmente puede asociarse a un pedido en particular.
    """
    if payload.monto <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto del abono debe ser mayor a cero",
        )

    # 1. Validar cliente
    cliente = await db.get(Cliente, payload.cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente con ID {payload.cliente_id} no encontrado",
        )

    # 2. Validar pedido si se especificó
    pedido = None
    if payload.pedido_id:
        pedido = await db.get(Pedido, payload.pedido_id)
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pedido con ID {payload.pedido_id} no encontrado",
            )
        if pedido.cliente_id != cliente.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El pedido indicado no pertenece al cliente especificado",
            )

    fecha_abono = payload.fecha or date.today()

    # 3. Crear AbonoCredito
    nuevo_abono = AbonoCredito(
        cliente_id=cliente.id,
        pedido_id=pedido.id if pedido else None,
        fecha=fecha_abono,
        monto=payload.monto,
        metodo=payload.metodo,
        referencia=payload.referencia,
        notas=payload.notas,
        registrado_por=current_user.id,
    )
    db.add(nuevo_abono)

    # 4. Amortizar deuda global del cliente
    cliente.saldo_pendiente_global = max(
        Decimal("0.00"),
        Decimal(str(cliente.saldo_pendiente_global)) - payload.monto,
    )

    # 5. Si vino pedido, amortizar saldo de ese pedido
    if pedido:
        pedido.saldo_pendiente = max(
            Decimal("0.00"),
            Decimal(str(pedido.saldo_pendiente)) - payload.monto,
        )
        historial = HistorialPedido(
            pedido_id=pedido.id,
            usuario_id=current_user.id,
            estado_anterior=pedido.estado,
            estado_nuevo=pedido.estado,
            observacion=(
                f"Abono a crédito #{nuevo_abono.id} por ${payload.monto:,.2f} ({payload.metodo.value}). "
                f"Nuevo saldo del pedido: ${pedido.saldo_pendiente:,.2f}."
            ),
        )
        db.add(historial)

    await db.commit()
    await db.refresh(nuevo_abono)

    return AbonoCreditoOut(
        id=nuevo_abono.id,
        cliente_id=nuevo_abono.cliente_id,
        pedido_id=nuevo_abono.pedido_id,
        fecha=nuevo_abono.fecha,
        monto=nuevo_abono.monto,
        metodo=nuevo_abono.metodo,
        referencia=nuevo_abono.referencia,
        notas=nuevo_abono.notas,
        registrado_por=nuevo_abono.registrado_por,
        creado_en=nuevo_abono.creado_en,
        cliente_nombre=cliente.nombre,
        registrado_por_nombre=current_user.nombre,
    )


@router.get(
    "/abonos",
    response_model=List[AbonoCreditoOut],
    dependencies=[Depends(require_role([RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]))],
)
async def listar_abonos(
    cliente_id: Optional[int] = None,
    pedido_id: Optional[int] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    metodo: Optional[MetodoPago] = None,
    db: AsyncSession = Depends(get_db),
):
    """Lista abonos a crédito con filtros opcionales."""
    query = (
        select(AbonoCredito)
        .options(
            selectinload(AbonoCredito.cliente),
            selectinload(AbonoCredito.usuario_registro),
        )
        .order_by(desc(AbonoCredito.fecha), desc(AbonoCredito.id))
    )

    if cliente_id:
        query = query.where(AbonoCredito.cliente_id == cliente_id)
    if pedido_id:
        query = query.where(AbonoCredito.pedido_id == pedido_id)
    if fecha_inicio:
        query = query.where(AbonoCredito.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.where(AbonoCredito.fecha <= fecha_fin)
    if metodo:
        query = query.where(AbonoCredito.metodo == metodo)

    result = await db.execute(query)
    abonos = result.scalars().all()

    return [
        AbonoCreditoOut(
            id=a.id,
            cliente_id=a.cliente_id,
            pedido_id=a.pedido_id,
            fecha=a.fecha,
            monto=a.monto,
            metodo=a.metodo,
            referencia=a.referencia,
            notas=a.notas,
            registrado_por=a.registrado_por,
            creado_en=a.creado_en,
            cliente_nombre=a.cliente.nombre if a.cliente else "Desconocido",
            registrado_por_nombre=a.usuario_registro.nombre if a.usuario_registro else None,
        )
        for a in abonos
    ]


@router.get(
    "/cuentas-por-cobrar",
    response_model=List[CuentaPorCobrarOut],
    dependencies=[Depends(require_role([RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]))],
)
async def obtener_cuentas_por_cobrar(
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna clientes con saldo pendiente global mayor a cero,
    analizando utilización de crédito y antigüedad de deuda.
    """
    # 1. Obtener todos los clientes activos con deuda
    result = await db.execute(
        select(Cliente)
        .where(and_(Cliente.activo == True, Cliente.saldo_pendiente_global > Decimal("0.00")))
        .order_by(desc(Cliente.saldo_pendiente_global))
    )
    clientes = result.scalars().all()

    # 2. Obtener pedidos pendientes asociados
    cuentas = []
    for c in clientes:
        # Consultar pedidos del cliente con saldo pendiente
        pedidos_res = await db.execute(
            select(Pedido)
            .where(
                and_(
                    Pedido.cliente_id == c.id,
                    Pedido.saldo_pendiente > Decimal("0.00"),
                    Pedido.estado != EstadoPedido.CANCELADO,
                )
            )
            .order_by(Pedido.fecha.asc())
        )
        pedidos_cliente = pedidos_res.scalars().all()

        cred_max = Decimal(str(c.credito_maximo))
        saldo_global = Decimal(str(c.saldo_pendiente_global))

        if cred_max > Decimal("0.00"):
            porcentaje = float((saldo_global / cred_max) * Decimal("100.00"))
        else:
            porcentaje = 100.0 if saldo_global > 0 else 0.0

        if saldo_global > cred_max:
            alerta = "bloqueado"
        elif porcentaje >= 80.0:
            alerta = "alerta"
        else:
            alerta = "normal"

        pedido_mas_antiguo = pedidos_cliente[0].fecha if pedidos_cliente else None

        cuentas.append(
            CuentaPorCobrarOut(
                cliente_id=c.id,
                cliente_nombre=c.nombre,
                documento=c.documento,
                telefono=c.telefono,
                credito_maximo=c.credito_maximo,
                saldo_pendiente_global=c.saldo_pendiente_global,
                porcentaje_cupo_usado=round(porcentaje, 1),
                alerta_riesgo=alerta,
                pedidos_pendientes_count=len(pedidos_cliente),
                pedido_mas_antiguo_fecha=pedido_mas_antiguo,
            )
        )

    return cuentas


@router.get(
    "/cierre-caja",
    response_model=CierreCajaOut,
    dependencies=[Depends(require_role([RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]))],
)
async def reporte_cierre_caja(
    fecha: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera el reporte de caja diario discriminado por métodos de pago y detalle de movimientos.
    """
    target_date = fecha or date.today()

    # 1. Obtener pagos directos de pedidos de esa fecha
    pagos_res = await db.execute(
        select(Pago)
        .options(
            selectinload(Pago.cliente),
            selectinload(Pago.usuario_registro),
        )
        .where(Pago.fecha == target_date)
        .order_by(desc(Pago.id))
    )
    pagos = pagos_res.scalars().all()

    # 2. Obtener abonos a crédito de esa fecha
    abonos_res = await db.execute(
        select(AbonoCredito)
        .options(
            selectinload(AbonoCredito.cliente),
            selectinload(AbonoCredito.usuario_registro),
        )
        .where(AbonoCredito.fecha == target_date)
        .order_by(desc(AbonoCredito.id))
    )
    abonos = abonos_res.scalars().all()

    # 3. Consolidar movimientos
    movimientos: List[MovimientoCajaItem] = []
    conteo_metodos = {m.value: {"total": Decimal("0.00"), "cantidad": 0} for m in MetodoPago}

    for p in pagos:
        monto = Decimal(str(p.monto))
        metodo_val = p.metodo.value if hasattr(p.metodo, "value") else str(p.metodo)
        conteo_metodos[metodo_val]["total"] += monto
        conteo_metodos[metodo_val]["cantidad"] += 1

        movimientos.append(
            MovimientoCajaItem(
                id=p.id,
                tipo="pago_pedido",
                fecha=p.fecha,
                monto=p.monto,
                metodo=p.metodo,
                referencia=p.referencia,
                cliente_id=p.cliente_id,
                cliente_nombre=p.cliente.nombre if p.cliente else "Desconocido",
                pedido_id=p.pedido_id,
                registrado_por_nombre=p.usuario_registro.nombre if p.usuario_registro else None,
            )
        )

    for a in abonos:
        monto = Decimal(str(a.monto))
        metodo_val = a.metodo.value if hasattr(a.metodo, "value") else str(a.metodo)
        conteo_metodos[metodo_val]["total"] += monto
        conteo_metodos[metodo_val]["cantidad"] += 1

        movimientos.append(
            MovimientoCajaItem(
                id=a.id,
                tipo="abono_credito",
                fecha=a.fecha,
                monto=a.monto,
                metodo=a.metodo,
                referencia=a.referencia,
                cliente_id=a.cliente_id,
                cliente_nombre=a.cliente.nombre if a.cliente else "Desconocido",
                pedido_id=a.pedido_id,
                registrado_por_nombre=a.usuario_registro.nombre if a.usuario_registro else None,
            )
        )

    total_recaudado = sum((item.monto for item in movimientos), Decimal("0.00"))
    total_efectivo = conteo_metodos["efectivo"]["total"]
    total_transferencias = conteo_metodos["transferencia"]["total"]
    total_billeteras = conteo_metodos["nequi"]["total"] + conteo_metodos["daviplata"]["total"]
    total_tarjetas = conteo_metodos["tarjeta"]["total"]
    total_otros = conteo_metodos["otro"]["total"]

    desglose = [
        MetodoResumen(
            metodo=m.value,
            total=conteo_metodos[m.value]["total"],
            cantidad=conteo_metodos[m.value]["cantidad"],
        )
        for m in MetodoPago
    ]

    return CierreCajaOut(
        fecha=target_date,
        total_recaudado=total_recaudado,
        total_efectivo=total_efectivo,
        total_transferencias=total_transferencias,
        total_billeteras_digitales=total_billeteras,
        total_tarjetas=total_tarjetas,
        total_otros=total_otros,
        desglose_metodos=desglose,
        movimientos=movimientos,
    )
