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
from app.models.tesoreria import MetodoPago, MonedaPago, Pago, AbonoCredito
from app.services.tasa_service import obtener_tasa_actual
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

router = APIRouter(prefix="/tesoreria", tags=["Tesorería & Caja (Venezuela USD/Bs)"])

NOMBRES_METODOS = {
    MetodoPago.PAGO_MOVIL.value: ("Pago Móvil (Bs)", "BS"),
    MetodoPago.EFECTIVO_USD.value: ("Efectivo Dólares ($)", "USD"),
    MetodoPago.EFECTIVO_BS.value: ("Efectivo Bolívares (Bs)", "BS"),
    MetodoPago.TRANSFERENCIA_BS.value: ("Transferencia Bancaria (Bs)", "BS"),
    MetodoPago.PUNTO_VENTA.value: ("Punto de Venta / Débito (Bs)", "BS"),
    MetodoPago.ZELLE.value: ("Zelle ($)", "USD"),
    MetodoPago.BINANCE.value: ("Binance Pay / USDT ($)", "USD"),
    MetodoPago.OTRO.value: ("Otros (Zinli, etc.)", "USD"),
}


@router.post(
    "/pagos",
    response_model=PagoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))],
)
async def registrar_pago_pedido(
    payload: PagoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Registra un pago para un pedido bajo el esquema financiero de Venezuela.
    - Acepta pagos en Dólares ($ USD) o en Bolívares (Bs.).
    - Aplica la tasa de cambio activa (BCV) o la tasa acordada.
    - Reduce el saldo pendiente del pedido (en USD) y el saldo del cliente.
    - Desbloquea a producción si el anticipo acumulado alcanza >= 30%.
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

    # 2. Determinar tasa de cambio aplicada
    if payload.tasa_cambio and payload.tasa_cambio > Decimal("0.0000"):
        tasa_aplicada = payload.tasa_cambio
    else:
        tasa_db = await obtener_tasa_actual(db)
        tasa_aplicada = Decimal(str(tasa_db.tasa))

    # 3. Conversión bimonetaria USD <-> Bs
    if payload.moneda_pago == MonedaPago.USD:
        monto_usd = round(payload.monto, 2)
        monto_bs = round(monto_usd * tasa_aplicada, 2)
    else:  # Pago recibido en Bolívares (Bs.)
        monto_bs = round(payload.monto, 2)
        monto_usd = round(monto_bs / tasa_aplicada, 2)

    fecha_pago = payload.fecha or date.today()

    # 4. Crear registro de Pago
    nuevo_pago = Pago(
        pedido_id=pedido.id,
        cliente_id=pedido.cliente_id,
        fecha=fecha_pago,
        monto=monto_usd,  # Base USD para amortización
        monto_usd=monto_usd,
        monto_bs=monto_bs,
        tasa_cambio=tasa_aplicada,
        moneda_pago=payload.moneda_pago,
        metodo=payload.metodo,
        banco=payload.banco,
        telefono=payload.telefono,
        referencia=payload.referencia,
        registrado_por=current_user.id,
    )
    db.add(nuevo_pago)
    await db.flush()

    # 5. Actualizar valores en el pedido (en USD)
    nuevo_anticipo_acumulado = Decimal(str(pedido.anticipo)) + monto_usd
    nuevo_saldo_pedido = max(Decimal("0.00"), Decimal(str(pedido.saldo_pendiente)) - monto_usd)

    pedido.anticipo = nuevo_anticipo_acumulado
    pedido.saldo_pendiente = nuevo_saldo_pedido

    # 6. Actualizar saldo global del cliente (en USD)
    cliente = pedido.cliente
    if cliente:
        cliente.saldo_pendiente_global = max(
            Decimal("0.00"),
            Decimal(str(cliente.saldo_pendiente_global)) - monto_usd,
        )

    # 7. Regla de negocio: Desbloqueo a producción si el anticipo alcanza >= 30%
    minimo_anticipo = Decimal(str(pedido.total)) * Decimal("0.30")
    metodo_label = NOMBRES_METODOS.get(payload.metodo.value, (payload.metodo.value, ""))[0]

    if pedido.estado == EstadoPedido.BORRADOR and nuevo_anticipo_acumulado >= minimo_anticipo:
        estado_previo = pedido.estado
        pedido.estado = EstadoPedido.PENDIENTE_CORTE

        historial = HistorialPedido(
            pedido_id=pedido.id,
            usuario_id=current_user.id,
            estado_anterior=estado_previo,
            estado_nuevo=EstadoPedido.PENDIENTE_CORTE,
            observacion=(
                f"Pago #{nuevo_pago.id}: Recibido ${monto_usd:,.2f} USD (Bs. {monto_bs:,.2f} a tasa {tasa_aplicada:,.2f}) vía {metodo_label}. "
                f"Anticipo del 30% completado (${nuevo_anticipo_acumulado:,.2f}/${pedido.total:,.2f} USD). Pedido desbloqueado a corte."
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
                f"Pago #{nuevo_pago.id}: Registrado ${monto_usd:,.2f} USD (Bs. {monto_bs:,.2f} a tasa {tasa_aplicada:,.2f}) vía {metodo_label}. "
                f"Saldo restante del pedido: ${pedido.saldo_pendiente:,.2f} USD."
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
        monto=nuevo_pago.monto_usd,
        monto_usd=nuevo_pago.monto_usd,
        monto_bs=nuevo_pago.monto_bs,
        moneda_pago=nuevo_pago.moneda_pago,
        tasa_cambio=nuevo_pago.tasa_cambio,
        metodo=nuevo_pago.metodo,
        banco=nuevo_pago.banco,
        telefono=nuevo_pago.telefono,
        referencia=nuevo_pago.referencia,
        registrado_por=nuevo_pago.registrado_por,
        creado_en=nuevo_pago.creado_en,
        cliente_nombre=cliente.nombre if cliente else "Cliente",
        registrado_por_nombre=current_user.nombre,
    )


@router.get(
    "/pagos",
    response_model=List[PagoOut],
    dependencies=[Depends(require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))],
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
            monto=p.monto_usd if p.monto_usd is not None else p.monto,
            monto_usd=p.monto_usd if p.monto_usd is not None else p.monto,
            monto_bs=p.monto_bs or Decimal("0.00"),
            moneda_pago=p.moneda_pago or MonedaPago.USD,
            tasa_cambio=p.tasa_cambio or Decimal("1.0000"),
            metodo=p.metodo,
            banco=p.banco,
            telefono=p.telefono,
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
    dependencies=[Depends(require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))],
)
async def registrar_abono_credito(
    payload: AbonoCreditoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Registra un abono a la cuenta de crédito del cliente en USD o Bolívares.
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

    # 3. Tasa y conversión bimonetaria
    if payload.tasa_cambio and payload.tasa_cambio > Decimal("0.0000"):
        tasa_aplicada = payload.tasa_cambio
    else:
        tasa_db = await obtener_tasa_actual(db)
        tasa_aplicada = Decimal(str(tasa_db.tasa))

    if payload.moneda_pago == MonedaPago.USD:
        monto_usd = round(payload.monto, 2)
        monto_bs = round(monto_usd * tasa_aplicada, 2)
    else:
        monto_bs = round(payload.monto, 2)
        monto_usd = round(monto_bs / tasa_aplicada, 2)

    fecha_abono = payload.fecha or date.today()

    # 4. Crear AbonoCredito
    nuevo_abono = AbonoCredito(
        cliente_id=cliente.id,
        pedido_id=pedido.id if pedido else None,
        fecha=fecha_abono,
        monto=monto_usd,
        monto_usd=monto_usd,
        monto_bs=monto_bs,
        tasa_cambio=tasa_aplicada,
        moneda_pago=payload.moneda_pago,
        metodo=payload.metodo,
        banco=payload.banco,
        telefono=payload.telefono,
        referencia=payload.referencia,
        notas=payload.notas,
        registrado_por=current_user.id,
    )
    db.add(nuevo_abono)

    # 5. Amortizar deuda global del cliente (USD)
    cliente.saldo_pendiente_global = max(
        Decimal("0.00"),
        Decimal(str(cliente.saldo_pendiente_global)) - monto_usd,
    )

    # 6. Si vino pedido, amortizar saldo de ese pedido
    if pedido:
        pedido.saldo_pendiente = max(
            Decimal("0.00"),
            Decimal(str(pedido.saldo_pendiente)) - monto_usd,
        )
        metodo_label = NOMBRES_METODOS.get(payload.metodo.value, (payload.metodo.value, ""))[0]
        historial = HistorialPedido(
            pedido_id=pedido.id,
            usuario_id=current_user.id,
            estado_anterior=pedido.estado,
            estado_nuevo=pedido.estado,
            observacion=(
                f"Abono #{nuevo_abono.id} por ${monto_usd:,.2f} USD (Bs. {monto_bs:,.2f}) vía {metodo_label}. "
                f"Nuevo saldo del pedido: ${pedido.saldo_pendiente:,.2f} USD."
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
        monto=nuevo_abono.monto_usd,
        monto_usd=nuevo_abono.monto_usd,
        monto_bs=nuevo_abono.monto_bs,
        moneda_pago=nuevo_abono.moneda_pago,
        tasa_cambio=nuevo_abono.tasa_cambio,
        metodo=nuevo_abono.metodo,
        banco=nuevo_abono.banco,
        telefono=nuevo_abono.telefono,
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
    dependencies=[Depends(require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))],
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
            monto=a.monto_usd if a.monto_usd is not None else a.monto,
            monto_usd=a.monto_usd if a.monto_usd is not None else a.monto,
            monto_bs=a.monto_bs or Decimal("0.00"),
            moneda_pago=a.moneda_pago or MonedaPago.USD,
            tasa_cambio=a.tasa_cambio or Decimal("1.0000"),
            metodo=a.metodo,
            banco=a.banco,
            telefono=a.telefono,
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
    dependencies=[Depends(require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))],
)
async def obtener_cuentas_por_cobrar(
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna clientes con saldo pendiente de cobro expresado tanto en USD ($)
    como en su valor equivalente en Bolívares (Bs.) según la tasa activa.
    """
    tasa_db = await obtener_tasa_actual(db)
    tasa_actual = Decimal(str(tasa_db.tasa))

    result = await db.execute(
        select(Cliente)
        .where(and_(Cliente.activo == True, Cliente.saldo_pendiente_global > Decimal("0.00")))
        .order_by(desc(Cliente.saldo_pendiente_global))
    )
    clientes = result.scalars().all()

    cuentas = []
    for c in clientes:
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
        saldo_global_usd = Decimal(str(c.saldo_pendiente_global))
        saldo_global_bs = round(saldo_global_usd * tasa_actual, 2)

        if cred_max > Decimal("0.00"):
            porcentaje = float((saldo_global_usd / cred_max) * Decimal("100.00"))
        else:
            porcentaje = 100.0 if saldo_global_usd > 0 else 0.0

        if saldo_global_usd > cred_max:
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
                saldo_pendiente_bs=saldo_global_bs,
                tasa_cambio=tasa_actual,
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
    dependencies=[Depends(require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))],
)
async def reporte_cierre_caja(
    fecha: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Arqueo y Cierre de Caja diario adaptado al ecosistema de Venezuela.
    Genera balances separados en Dólares ($) y Bolívares (Bs.) y por cada método:
    Pago Móvil, Zelle, Efectivo USD, Efectivo Bs, Transferencia Bs, Binance, etc.
    """
    target_date = fecha or date.today()
    tasa_db = await obtener_tasa_actual(db)
    tasa_actual = Decimal(str(tasa_db.tasa))

    # Pagos de pedidos del día
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

    # Abonos a crédito del día
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

    movimientos: List[MovimientoCajaItem] = []
    conteo_metodos = {
        m.value: {
            "total_usd": Decimal("0.00"),
            "total_bs": Decimal("0.00"),
            "cantidad": 0,
            "nombre": NOMBRES_METODOS.get(m.value, (m.value, "USD"))[0],
            "moneda": NOMBRES_METODOS.get(m.value, (m.value, "USD"))[1],
        }
        for m in MetodoPago
    }

    for p in pagos:
        m_usd = p.monto_usd if p.monto_usd is not None else p.monto
        m_bs = p.monto_bs if p.monto_bs is not None else round(m_usd * tasa_actual, 2)
        metodo_val = p.metodo.value if hasattr(p.metodo, "value") else str(p.metodo)

        if metodo_val in conteo_metodos:
            conteo_metodos[metodo_val]["total_usd"] += Decimal(str(m_usd))
            conteo_metodos[metodo_val]["total_bs"] += Decimal(str(m_bs))
            conteo_metodos[metodo_val]["cantidad"] += 1

        movimientos.append(
            MovimientoCajaItem(
                id=p.id,
                tipo="pago_pedido",
                fecha=p.fecha,
                monto_usd=m_usd,
                monto_bs=m_bs,
                moneda_pago=p.moneda_pago or MonedaPago.USD,
                tasa_cambio=p.tasa_cambio or tasa_actual,
                metodo=p.metodo,
                banco=p.banco,
                telefono=p.telefono,
                referencia=p.referencia,
                cliente_id=p.cliente_id,
                cliente_nombre=p.cliente.nombre if p.cliente else "Desconocido",
                pedido_id=p.pedido_id,
                registrado_por_nombre=p.usuario_registro.nombre if p.usuario_registro else None,
            )
        )

    for a in abonos:
        m_usd = a.monto_usd if a.monto_usd is not None else a.monto
        m_bs = a.monto_bs if a.monto_bs is not None else round(m_usd * tasa_actual, 2)
        metodo_val = a.metodo.value if hasattr(a.metodo, "value") else str(a.metodo)

        if metodo_val in conteo_metodos:
            conteo_metodos[metodo_val]["total_usd"] += Decimal(str(m_usd))
            conteo_metodos[metodo_val]["total_bs"] += Decimal(str(m_bs))
            conteo_metodos[metodo_val]["cantidad"] += 1

        movimientos.append(
            MovimientoCajaItem(
                id=a.id,
                tipo="abono_credito",
                fecha=a.fecha,
                monto_usd=m_usd,
                monto_bs=m_bs,
                moneda_pago=a.moneda_pago or MonedaPago.USD,
                tasa_cambio=a.tasa_cambio or tasa_actual,
                metodo=a.metodo,
                banco=a.banco,
                telefono=a.telefono,
                referencia=a.referencia,
                cliente_id=a.cliente_id,
                cliente_nombre=a.cliente.nombre if a.cliente else "Desconocido",
                pedido_id=a.pedido_id,
                registrado_por_nombre=a.usuario_registro.nombre if a.usuario_registro else None,
            )
        )

    total_usd = sum((item.monto_usd for item in movimientos), Decimal("0.00"))
    total_bs = sum((item.monto_bs for item in movimientos), Decimal("0.00"))

    desglose = [
        MetodoResumen(
            metodo=m.value,
            nombre_legible=conteo_metodos[m.value]["nombre"],
            moneda_base=conteo_metodos[m.value]["moneda"],
            total_usd=conteo_metodos[m.value]["total_usd"],
            total_bs=conteo_metodos[m.value]["total_bs"],
            cantidad=conteo_metodos[m.value]["cantidad"],
        )
        for m in MetodoPago
    ]

    return CierreCajaOut(
        fecha=target_date,
        tasa_referencia=tasa_actual,
        total_recaudado_usd=total_usd,
        total_recaudado_bs=total_bs,
        total_efectivo_usd=conteo_metodos[MetodoPago.EFECTIVO_USD.value]["total_usd"],
        total_zelle=conteo_metodos[MetodoPago.ZELLE.value]["total_usd"],
        total_binance=conteo_metodos[MetodoPago.BINANCE.value]["total_usd"],
        total_pago_movil=conteo_metodos[MetodoPago.PAGO_MOVIL.value]["total_bs"],
        total_transferencias_bs=conteo_metodos[MetodoPago.TRANSFERENCIA_BS.value]["total_bs"],
        total_punto_venta=conteo_metodos[MetodoPago.PUNTO_VENTA.value]["total_bs"],
        total_efectivo_bs=conteo_metodos[MetodoPago.EFECTIVO_BS.value]["total_bs"],
        total_otros=conteo_metodos[MetodoPago.OTRO.value]["total_usd"],
        desglose_metodos=desglose,
        movimientos=movimientos,
    )
