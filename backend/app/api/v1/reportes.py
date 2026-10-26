import csv
import io
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_, desc, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.core.deps import require_role
from app.models.usuario import RolUsuario, Usuario
from app.models.cliente import Cliente
from app.models.pedido import Pedido, EstadoPedido, LineaPedido
from app.models.producto import Producto, Variante
from app.models.produccion import (
    OrdenCorte, OrdenImpresion, OrdenConfeccion,
    TecnicaImpresion, EstadoEtapaProduccion,
)
from app.models.trabajador import Trabajador, Nomina, EstadoNomina
from app.models.tesoreria import Pago, AbonoCredito, MetodoPago

router = APIRouter(prefix="/reportes", tags=["Reportes & Rentabilidad"])

_ADMIN_ROLES = [RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO]


# ─────────────────────────────────────────────
# Schemas de respuesta
# ─────────────────────────────────────────────

class ItemVentaCliente(BaseModel):
    cliente_id: int
    cliente_nombre: str
    documento: str
    total_pedidos: int
    total_facturado: Decimal
    total_cobrado: Decimal
    saldo_pendiente: Decimal

class ItemVentaProducto(BaseModel):
    variante_id: int
    sku: str
    producto_nombre: str
    color: str
    talla: str
    unidades_vendidas: int
    total_facturado: Decimal

class ItemVentaVendedor(BaseModel):
    vendedor_id: int
    vendedor_nombre: str
    total_pedidos: int
    total_facturado: Decimal
    total_cobrado: Decimal

class ReporteVentasOut(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    total_pedidos: int
    total_facturado: Decimal
    total_cobrado: Decimal
    total_cartera: Decimal
    por_cliente: List[ItemVentaCliente]
    por_producto: List[ItemVentaProducto]
    por_vendedor: List[ItemVentaVendedor]

class ItemProduccionOperario(BaseModel):
    trabajador_id: int
    trabajador_nombre: str
    rol_produccion: str   # cortador / tecnico_impresion / confeccionista
    total_ordenes: int
    total_piezas: int
    costo_total: Decimal

class ItemTecnicaImpresion(BaseModel):
    tecnica: str
    total_ordenes: int
    total_piezas: int
    costo_total: Decimal

class ReporteProduccionOut(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    total_ordenes_corte: int
    total_ordenes_impresion: int
    total_ordenes_confeccion: int
    costo_total_produccion: Decimal
    por_operario: List[ItemProduccionOperario]
    por_tecnica_impresion: List[ItemTecnicaImpresion]

class ItemRentabilidadPedido(BaseModel):
    pedido_id: int
    cliente_nombre: str
    fecha: date
    estado: str
    total_facturado: Decimal
    total_cobrado: Decimal
    costo_produccion: Decimal
    ganancia_bruta: Decimal
    margen_porcentaje: float

class ReporteRentabilidadOut(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    total_facturado: Decimal
    total_cobrado: Decimal
    costo_total_produccion: Decimal
    ganancia_bruta_total: Decimal
    margen_promedio: float
    pedidos: List[ItemRentabilidadPedido]

class ItemMorosidad(BaseModel):
    cliente_id: int
    cliente_nombre: str
    documento: str
    telefono: Optional[str]
    pedido_id: int
    fecha_pedido: date
    dias_vencimiento: int
    saldo_pedido: Decimal
    credito_maximo: Decimal
    alerta: str  # 'normal' | 'alerta' | 'bloqueado'

class ReporteMorosidadOut(BaseModel):
    total_clientes_morosos: int
    total_deuda_vencida: Decimal
    clientes: List[ItemMorosidad]

class ItemReporteCajaMetodo(BaseModel):
    metodo: str
    total_usd: Decimal
    total_bs: Decimal
    cantidad_transacciones: int

class ItemReporteCajaDetalle(BaseModel):
    id: int
    tipo: str  # "pago_pedido" | "abono_credito"
    fecha: date
    cliente_nombre: str
    pedido_id: Optional[int]
    monto_usd: Decimal
    monto_bs: Decimal
    tasa_cambio: Decimal
    moneda_pago: str
    metodo: str
    banco: Optional[str]
    referencia: Optional[str]

class ReporteCajaOut(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    total_recaudado_usd: Decimal
    total_recaudado_bs: Decimal
    por_metodo: List[ItemReporteCajaMetodo]
    transacciones: List[ItemReporteCajaDetalle]

class ItemNominaLiquidada(BaseModel):
    id: int
    trabajador_id: int
    trabajador_nombre: str
    documento: str
    tipo_pago: str
    periodo_inicio: date
    periodo_fin: date
    total_producido: int
    monto_produccion: Decimal
    monto_fijo: Decimal
    total: Decimal
    estado: str
    fecha_pago: Optional[datetime] = None

class ReporteNominasOut(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    total_nominas: int
    total_pagado: Decimal
    total_pendiente: Decimal
    total_general: Decimal
    nominas: List[ItemNominaLiquidada]


# ─────────────────────────────────────────────
# Helper: rango de fechas por defecto (mes actual)
# ─────────────────────────────────────────────
def _default_range() -> tuple[date, date]:
    hoy = date.today()
    return date(hoy.year, hoy.month, 1), hoy


# ─────────────────────────────────────────────
# 1. Reporte de Ventas
# ─────────────────────────────────────────────
@router.get(
    "/ventas",
    response_model=ReporteVentasOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def reporte_ventas(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Reporte de ventas por cliente, producto y vendedor en el rango de fechas indicado."""
    fi, ff = fecha_inicio or _default_range()[0], fecha_fin or _default_range()[1]

    # Pedidos en el período
    ped_res = await db.execute(
        select(Pedido)
        .options(
            selectinload(Pedido.cliente),
            selectinload(Pedido.vendedor),
            selectinload(Pedido.lineas)
            .selectinload(LineaPedido.variante)
            .selectinload(Variante.producto),
        )
        .where(
            and_(
                Pedido.fecha >= fi,
                Pedido.fecha <= ff,
                Pedido.estado != EstadoPedido.CANCELADO,
            )
        )
        .order_by(Pedido.fecha)
    )
    pedidos = ped_res.scalars().all()

    total_facturado = Decimal("0.00")
    total_cobrado = Decimal("0.00")

    clientes_map: dict[int, ItemVentaCliente] = {}
    variantes_map: dict[int, dict] = {}
    vendedores_map: dict[int, ItemVentaVendedor] = {}

    for ped in pedidos:
        f = Decimal(str(ped.total))
        c = Decimal(str(ped.anticipo))
        total_facturado += f
        total_cobrado += c

        # Por cliente
        cid = ped.cliente_id
        if cid not in clientes_map:
            clientes_map[cid] = ItemVentaCliente(
                cliente_id=cid,
                cliente_nombre=ped.cliente.nombre if ped.cliente else "—",
                documento=ped.cliente.documento if ped.cliente else "—",
                total_pedidos=0,
                total_facturado=Decimal("0.00"),
                total_cobrado=Decimal("0.00"),
                saldo_pendiente=Decimal("0.00"),
            )
        clientes_map[cid].total_pedidos += 1
        clientes_map[cid].total_facturado += f
        clientes_map[cid].total_cobrado += c
        clientes_map[cid].saldo_pendiente += Decimal(str(ped.saldo_pendiente))

        # Por vendedor
        vid = ped.vendedor_id
        if vid not in vendedores_map:
            vendedores_map[vid] = ItemVentaVendedor(
                vendedor_id=vid,
                vendedor_nombre=ped.vendedor.nombre if ped.vendedor else "—",
                total_pedidos=0,
                total_facturado=Decimal("0.00"),
                total_cobrado=Decimal("0.00"),
            )
        vendedores_map[vid].total_pedidos += 1
        vendedores_map[vid].total_facturado += f
        vendedores_map[vid].total_cobrado += c

        # Por variante / producto
        for linea in ped.lineas:
            var = linea.variante
            if not var:
                continue
            if var.id not in variantes_map:
                variantes_map[var.id] = {
                    "variante_id": var.id,
                    "sku": var.sku_unico or "—",
                    "producto_nombre": var.producto.nombre if var.producto else "—",
                    "color": var.color,
                    "talla": var.talla,
                    "unidades_vendidas": 0,
                    "total_facturado": Decimal("0.00"),
                }
            variantes_map[var.id]["unidades_vendidas"] += linea.cantidad
            variantes_map[var.id]["total_facturado"] += Decimal(str(linea.subtotal))

    por_producto = [
        ItemVentaProducto(**v) for v in
        sorted(variantes_map.values(), key=lambda x: x["total_facturado"], reverse=True)
    ]

    return ReporteVentasOut(
        fecha_inicio=fi,
        fecha_fin=ff,
        total_pedidos=len(pedidos),
        total_facturado=total_facturado,
        total_cobrado=total_cobrado,
        total_cartera=total_facturado - total_cobrado,
        por_cliente=sorted(clientes_map.values(), key=lambda x: x.total_facturado, reverse=True),
        por_producto=por_producto,
        por_vendedor=sorted(vendedores_map.values(), key=lambda x: x.total_facturado, reverse=True),
    )


# ─────────────────────────────────────────────
# 2. Reporte de Producción
# ─────────────────────────────────────────────
@router.get(
    "/produccion",
    response_model=ReporteProduccionOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def reporte_produccion(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Reporte de órdenes de producción por operario y técnica de impresión."""
    fi, ff = fecha_inicio or _default_range()[0], fecha_fin or _default_range()[1]

    # Órdenes de Corte
    cortes_res = await db.execute(
        select(OrdenCorte)
        .options(selectinload(OrdenCorte.cortador))
        .where(and_(OrdenCorte.fecha >= fi, OrdenCorte.fecha <= ff))
    )
    cortes = cortes_res.scalars().all()

    # Órdenes de Impresión
    impresiones_res = await db.execute(
        select(OrdenImpresion)
        .options(selectinload(OrdenImpresion.tecnico))
        .where(and_(OrdenImpresion.fecha >= fi, OrdenImpresion.fecha <= ff))
    )
    impresiones = impresiones_res.scalars().all()

    # Órdenes de Confección
    confecciones_res = await db.execute(
        select(OrdenConfeccion)
        .options(selectinload(OrdenConfeccion.operador))
        .where(and_(OrdenConfeccion.fecha >= fi, OrdenConfeccion.fecha <= ff))
    )
    confecciones = confecciones_res.scalars().all()

    costo_total = Decimal("0.00")
    operarios_map: dict[str, dict] = {}

    def _agregar_operario(key: str, nombre: str, rol: str, piezas: int, costo: Decimal):
        if key not in operarios_map:
            operarios_map[key] = {
                "trabajador_id": int(key.split("_")[0]),
                "trabajador_nombre": nombre,
                "rol_produccion": rol,
                "total_ordenes": 0,
                "total_piezas": 0,
                "costo_total": Decimal("0.00"),
            }
        operarios_map[key]["total_ordenes"] += 1
        operarios_map[key]["total_piezas"] += piezas
        operarios_map[key]["costo_total"] += costo

    for c in cortes:
        t = Decimal(str(c.total))
        costo_total += t
        nombre = c.cortador.nombre if c.cortador else "—"
        _agregar_operario(f"{c.cortador_id}_corte", nombre, "Cortador", c.cantidad_piezas, t)

    for i in impresiones:
        t = Decimal(str(i.total))
        costo_total += t
        nombre = i.tecnico.nombre if i.tecnico else "—"
        _agregar_operario(f"{i.tecnico_id}_impresion", nombre, "Técnico Impresión", i.cantidad, t)

    for cf in confecciones:
        t = Decimal(str(cf.total))
        costo_total += t
        nombre = cf.operador.nombre if cf.operador else "—"
        _agregar_operario(f"{cf.operador_id}_confeccion", nombre, "Confeccionista", cf.cantidad_prendas, t)

    # Por técnica de impresión
    tecnica_map: dict[str, dict] = {}
    for i in impresiones:
        key = i.tecnica.value if hasattr(i.tecnica, "value") else str(i.tecnica)
        if key not in tecnica_map:
            tecnica_map[key] = {"tecnica": key, "total_ordenes": 0, "total_piezas": 0, "costo_total": Decimal("0.00")}
        tecnica_map[key]["total_ordenes"] += 1
        tecnica_map[key]["total_piezas"] += i.cantidad
        tecnica_map[key]["costo_total"] += Decimal(str(i.total))

    return ReporteProduccionOut(
        fecha_inicio=fi,
        fecha_fin=ff,
        total_ordenes_corte=len(cortes),
        total_ordenes_impresion=len(impresiones),
        total_ordenes_confeccion=len(confecciones),
        costo_total_produccion=costo_total,
        por_operario=[
            ItemProduccionOperario(**v)
            for v in sorted(operarios_map.values(), key=lambda x: x["costo_total"], reverse=True)
        ],
        por_tecnica_impresion=[
            ItemTecnicaImpresion(**v)
            for v in sorted(tecnica_map.values(), key=lambda x: x["costo_total"], reverse=True)
        ],
    )


# ─────────────────────────────────────────────
# 3. Reporte de Rentabilidad por Pedido
# ─────────────────────────────────────────────
@router.get(
    "/rentabilidad",
    response_model=ReporteRentabilidadOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def reporte_rentabilidad(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Reporte de rentabilidad bruta por pedido: ingreso vs costos de producción."""
    fi, ff = fecha_inicio or _default_range()[0], fecha_fin or _default_range()[1]

    ped_res = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.cliente))
        .where(
            and_(
                Pedido.fecha >= fi,
                Pedido.fecha <= ff,
                Pedido.estado != EstadoPedido.CANCELADO,
                Pedido.estado != EstadoPedido.BORRADOR,
            )
        )
        .order_by(desc(Pedido.fecha))
    )
    pedidos = ped_res.scalars().all()

    total_facturado = Decimal("0.00")
    total_cobrado = Decimal("0.00")
    costo_total = Decimal("0.00")
    ganancia_total = Decimal("0.00")
    items: List[ItemRentabilidadPedido] = []

    for ped in pedidos:
        pid = ped.id

        # Costo corte
        corte_res = await db.execute(
            select(func.coalesce(func.sum(OrdenCorte.total), Decimal("0.00")))
            .where(OrdenCorte.pedido_id == pid)
        )
        costo_corte = Decimal(str(corte_res.scalar() or 0))

        # Costo impresión
        imp_res = await db.execute(
            select(func.coalesce(func.sum(OrdenImpresion.total), Decimal("0.00")))
            .where(OrdenImpresion.pedido_id == pid)
        )
        costo_imp = Decimal(str(imp_res.scalar() or 0))

        # Costo confección
        conf_res = await db.execute(
            select(func.coalesce(func.sum(OrdenConfeccion.total), Decimal("0.00")))
            .where(OrdenConfeccion.pedido_id == pid)
        )
        costo_conf = Decimal(str(conf_res.scalar() or 0))

        costo_prod = costo_corte + costo_imp + costo_conf
        facturado = Decimal(str(ped.total))
        cobrado = Decimal(str(ped.anticipo))
        ganancia = facturado - costo_prod
        margen = float((ganancia / facturado * 100)) if facturado > 0 else 0.0

        total_facturado += facturado
        total_cobrado += cobrado
        costo_total += costo_prod
        ganancia_total += ganancia

        items.append(ItemRentabilidadPedido(
            pedido_id=pid,
            cliente_nombre=ped.cliente.nombre if ped.cliente else "—",
            fecha=ped.fecha,
            estado=ped.estado.value if hasattr(ped.estado, "value") else str(ped.estado),
            total_facturado=facturado,
            total_cobrado=cobrado,
            costo_produccion=costo_prod,
            ganancia_bruta=ganancia,
            margen_porcentaje=round(margen, 1),
        ))

    margen_promedio = float(
        (ganancia_total / total_facturado * 100) if total_facturado > 0 else Decimal("0.00")
    )

    return ReporteRentabilidadOut(
        fecha_inicio=fi,
        fecha_fin=ff,
        total_facturado=total_facturado,
        total_cobrado=total_cobrado,
        costo_total_produccion=costo_total,
        ganancia_bruta_total=ganancia_total,
        margen_promedio=round(margen_promedio, 1),
        pedidos=items,
    )


# ─────────────────────────────────────────────
# 4. Reporte de Morosidad
# ─────────────────────────────────────────────
@router.get(
    "/morosidad",
    response_model=ReporteMorosidadOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def reporte_morosidad(
    dias_vencimiento: int = Query(default=0, ge=0, description="Mínimo de días vencido para incluir en el reporte"),
    db: AsyncSession = Depends(get_db),
):
    """
    Reporte de clientes con pedidos de saldo pendiente.
    `dias_vencimiento=30` retorna solo pedidos vencidos más de 30 días.
    """
    hoy = date.today()

    ped_res = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.cliente))
        .where(
            and_(
                Pedido.saldo_pendiente > Decimal("0.00"),
                Pedido.estado != EstadoPedido.CANCELADO,
                Pedido.estado != EstadoPedido.BORRADOR,
            )
        )
        .order_by(Pedido.fecha.asc())
    )
    pedidos = ped_res.scalars().all()

    items: List[ItemMorosidad] = []
    total_deuda = Decimal("0.00")
    clientes_vistos: set[int] = set()

    for ped in pedidos:
        dias = (hoy - ped.fecha).days
        if dias < dias_vencimiento:
            continue

        cliente = ped.cliente
        cred_max = Decimal(str(cliente.credito_maximo)) if cliente else Decimal("0.00")
        saldo_global = Decimal(str(cliente.saldo_pendiente_global)) if cliente else Decimal("0.00")

        if saldo_global > cred_max:
            alerta = "bloqueado"
        elif cred_max > 0 and (saldo_global / cred_max) >= Decimal("0.80"):
            alerta = "alerta"
        else:
            alerta = "normal"

        saldo_ped = Decimal(str(ped.saldo_pendiente))
        total_deuda += saldo_ped
        clientes_vistos.add(ped.cliente_id)

        items.append(ItemMorosidad(
            cliente_id=ped.cliente_id,
            cliente_nombre=cliente.nombre if cliente else "—",
            documento=cliente.documento if cliente else "—",
            telefono=cliente.telefono if cliente else None,
            pedido_id=ped.id,
            fecha_pedido=ped.fecha,
            dias_vencimiento=dias,
            saldo_pedido=saldo_ped,
            credito_maximo=cred_max,
            alerta=alerta,
        ))

    return ReporteMorosidadOut(
        total_clientes_morosos=len(clientes_vistos),
        total_deuda_vencida=total_deuda,
        clientes=sorted(items, key=lambda x: x.dias_vencimiento, reverse=True),
    )


# ─────────────────────────────────────────────
# 5. Reporte de Caja y Métodos Venezolanos
# ─────────────────────────────────────────────
@router.get(
    "/caja",
    response_model=ReporteCajaOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def reporte_caja(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Reporte de ingresos de caja por métodos de pago venezolanos y bancos en el período."""
    fi, ff = fecha_inicio or _default_range()[0], fecha_fin or _default_range()[1]

    # 1. Pagos a pedidos
    pagos_res = await db.execute(
        select(Pago)
        .options(selectinload(Pago.cliente))
        .where(and_(Pago.fecha >= fi, Pago.fecha <= ff))
        .order_by(desc(Pago.fecha), desc(Pago.id))
    )
    pagos = pagos_res.scalars().all()

    # 2. Abonos a créditos
    abonos_res = await db.execute(
        select(AbonoCredito)
        .options(selectinload(AbonoCredito.cliente))
        .where(and_(AbonoCredito.fecha >= fi, AbonoCredito.fecha <= ff))
        .order_by(desc(AbonoCredito.fecha), desc(AbonoCredito.id))
    )
    abonos = abonos_res.scalars().all()

    metodos_map: dict[str, dict] = {}
    transacciones: List[ItemReporteCajaDetalle] = []
    total_usd = Decimal("0.00")
    total_bs = Decimal("0.00")

    def _procesar_tx(tx_id, tipo, fecha, cliente_nombre, pedido_id, m_usd, m_bs, tasa, mon, met, banco, ref):
        nonlocal total_usd, total_bs
        u = Decimal(str(m_usd or 0))
        b = Decimal(str(m_bs or 0))
        total_usd += u
        total_bs += b

        met_str = met.value if hasattr(met, "value") else str(met or "otro")
        if met_str not in metodos_map:
            metodos_map[met_str] = {
                "metodo": met_str,
                "total_usd": Decimal("0.00"),
                "total_bs": Decimal("0.00"),
                "cantidad_transacciones": 0,
            }
        metodos_map[met_str]["total_usd"] += u
        metodos_map[met_str]["total_bs"] += b
        metodos_map[met_str]["cantidad_transacciones"] += 1

        transacciones.append(ItemReporteCajaDetalle(
            id=tx_id,
            tipo=tipo,
            fecha=fecha,
            cliente_nombre=cliente_nombre,
            pedido_id=pedido_id,
            monto_usd=u,
            monto_bs=b,
            tasa_cambio=Decimal(str(tasa or 1)),
            moneda_pago=mon.value if hasattr(mon, "value") else str(mon or "USD"),
            metodo=met_str,
            banco=banco,
            referencia=ref,
        ))

    for p in pagos:
        c_nombre = p.cliente.nombre if p.cliente else "—"
        _procesar_tx(p.id, "pago_pedido", p.fecha, c_nombre, p.pedido_id, p.monto_usd, p.monto_bs, p.tasa_cambio, p.moneda_pago, p.metodo, p.banco, p.referencia)

    for a in abonos:
        c_nombre = a.cliente.nombre if a.cliente else "—"
        _procesar_tx(a.id, "abono_credito", a.fecha, c_nombre, a.pedido_id, a.monto_usd, a.monto_bs, a.tasa_cambio, a.moneda_pago, a.metodo, a.banco, a.referencia)

    # Ordenar transacciones por fecha descendente
    transacciones.sort(key=lambda x: x.fecha, reverse=True)

    return ReporteCajaOut(
        fecha_inicio=fi,
        fecha_fin=ff,
        total_recaudado_usd=total_usd,
        total_recaudado_bs=total_bs,
        por_metodo=[
            ItemReporteCajaMetodo(**v)
            for v in sorted(metodos_map.values(), key=lambda x: x["total_usd"], reverse=True)
        ],
        transacciones=transacciones,
    )


# ─────────────────────────────────────────────
# 6. Reporte de Nóminas Liquidadas
# ─────────────────────────────────────────────
@router.get(
    "/nominas",
    response_model=ReporteNominasOut,
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
)
async def reporte_nominas(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Reporte de nóminas liquidadas y costos laborales en el período."""
    fi, ff = fecha_inicio or _default_range()[0], fecha_fin or _default_range()[1]

    nom_res = await db.execute(
        select(Nomina)
        .options(selectinload(Nomina.trabajador))
        .where(
            and_(
                Nomina.periodo_inicio >= fi,
                Nomina.periodo_fin <= ff,
            )
        )
        .order_by(desc(Nomina.periodo_inicio), desc(Nomina.id))
    )
    nominas = nom_res.scalars().all()

    total_pagado = Decimal("0.00")
    total_pendiente = Decimal("0.00")
    items: List[ItemNominaLiquidada] = []

    for n in nominas:
        tot = Decimal(str(n.total or 0))
        est = n.estado.value if hasattr(n.estado, "value") else str(n.estado)
        if est == "pagado":
            total_pagado += tot
        else:
            total_pendiente += tot

        items.append(ItemNominaLiquidada(
            id=n.id,
            trabajador_id=n.trabajador_id,
            trabajador_nombre=n.trabajador.nombre if n.trabajador else "—",
            documento=n.trabajador.documento if n.trabajador else "—",
            tipo_pago=n.tipo.value if hasattr(n.tipo, "value") else str(n.tipo),
            periodo_inicio=n.periodo_inicio,
            periodo_fin=n.periodo_fin,
            total_producido=n.total_producido,
            monto_produccion=Decimal(str(n.monto_produccion or 0)),
            monto_fijo=Decimal(str(n.monto_fijo or 0)),
            total=tot,
            estado=est,
            fecha_pago=n.fecha_pago,
        ))

    return ReporteNominasOut(
        fecha_inicio=fi,
        fecha_fin=ff,
        total_nominas=len(nominas),
        total_pagado=total_pagado,
        total_pendiente=total_pendiente,
        total_general=total_pagado + total_pendiente,
        nominas=items,
    )


# ─────────────────────────────────────────────
# 5. Exportaciones CSV
# ─────────────────────────────────────────────

def _csv_response(rows: list[list], headers: list[str], filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/ventas/csv",
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
    response_class=StreamingResponse,
)
async def exportar_ventas_csv(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Exporta el reporte de ventas por cliente en formato CSV."""
    data = await reporte_ventas(fecha_inicio, fecha_fin, db)
    rows = [
        [
            c.cliente_id, c.cliente_nombre, c.documento,
            c.total_pedidos, float(c.total_facturado),
            float(c.total_cobrado), float(c.saldo_pendiente),
        ]
        for c in data.por_cliente
    ]
    headers = ["ID Cliente", "Cliente", "Documento", "Pedidos", "Facturado", "Cobrado", "Saldo Pendiente"]
    fi = fecha_inicio or _default_range()[0]
    ff = fecha_fin or _default_range()[1]
    return _csv_response(rows, headers, f"ventas_{fi}_{ff}.csv")


@router.get(
    "/produccion/csv",
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
    response_class=StreamingResponse,
)
async def exportar_produccion_csv(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Exporta el reporte de producción por operario en formato CSV."""
    data = await reporte_produccion(fecha_inicio, fecha_fin, db)
    rows = [
        [
            o.trabajador_id, o.trabajador_nombre, o.rol_produccion,
            o.total_ordenes, o.total_piezas, float(o.costo_total),
        ]
        for o in data.por_operario
    ]
    headers = ["ID Trabajador", "Nombre", "Rol", "Órdenes", "Piezas", "Costo Total"]
    fi = fecha_inicio or _default_range()[0]
    ff = fecha_fin or _default_range()[1]
    return _csv_response(rows, headers, f"produccion_{fi}_{ff}.csv")


@router.get(
    "/rentabilidad/csv",
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
    response_class=StreamingResponse,
)
async def exportar_rentabilidad_csv(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Exporta el reporte de rentabilidad por pedido en formato CSV."""
    data = await reporte_rentabilidad(fecha_inicio, fecha_fin, db)
    rows = [
        [
            p.pedido_id, p.cliente_nombre, str(p.fecha), p.estado,
            float(p.total_facturado), float(p.total_cobrado),
            float(p.costo_produccion), float(p.ganancia_bruta), p.margen_porcentaje,
        ]
        for p in data.pedidos
    ]
    headers = [
        "ID Pedido", "Cliente", "Fecha", "Estado",
        "Facturado", "Cobrado", "Costo Producción", "Ganancia Bruta", "Margen %",
    ]
    fi = fecha_inicio or _default_range()[0]
    ff = fecha_fin or _default_range()[1]
    return _csv_response(rows, headers, f"rentabilidad_{fi}_{ff}.csv")


@router.get(
    "/morosidad/csv",
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
    response_class=StreamingResponse,
)
async def exportar_morosidad_csv(
    dias_vencimiento: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Exporta el reporte de morosidad en formato CSV."""
    data = await reporte_morosidad(dias_vencimiento, db)
    rows = [
        [
            c.cliente_id, c.cliente_nombre, c.documento, c.telefono or "",
            c.pedido_id, str(c.fecha_pedido), c.dias_vencimiento,
            float(c.saldo_pedido), float(c.credito_maximo), c.alerta,
        ]
        for c in data.clientes
    ]
    headers = [
        "ID Cliente", "Cliente", "Documento", "Teléfono",
        "ID Pedido", "Fecha Pedido", "Días Vencido",
        "Saldo Pedido", "Crédito Máximo", "Alerta",
    ]
    hoy = date.today()
    return _csv_response(rows, headers, f"morosidad_{hoy}.csv")


@router.get(
    "/caja/csv",
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
    response_class=StreamingResponse,
)
async def exportar_caja_csv(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Exporta el reporte de caja y transacciones en formato CSV."""
    data = await reporte_caja(fecha_inicio, fecha_fin, db)
    rows = [
        [
            t.id,
            t.tipo,
            str(t.fecha),
            t.cliente_nombre,
            t.pedido_id or "",
            float(t.monto_usd),
            float(t.monto_bs),
            float(t.tasa_cambio),
            t.moneda_pago,
            t.metodo,
            t.banco or "",
            t.referencia or "",
        ]
        for t in data.transacciones
    ]
    headers = [
        "ID", "Tipo", "Fecha", "Cliente", "ID Pedido",
        "Monto USD", "Monto Bs", "Tasa Cambio", "Moneda Pago",
        "Método", "Banco", "Referencia",
    ]
    fi = fecha_inicio or _default_range()[0]
    ff = fecha_fin or _default_range()[1]
    return _csv_response(rows, headers, f"caja_{fi}_{ff}.csv")


@router.get(
    "/nominas/csv",
    dependencies=[Depends(require_role(_ADMIN_ROLES))],
    response_class=StreamingResponse,
)
async def exportar_nominas_csv(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """Exporta el reporte de nóminas liquidadas en formato CSV."""
    data = await reporte_nominas(fecha_inicio, fecha_fin, db)
    rows = [
        [
            n.id,
            n.trabajador_nombre,
            n.documento,
            n.tipo_pago,
            str(n.periodo_inicio),
            str(n.periodo_fin),
            n.total_producido,
            float(n.monto_produccion),
            float(n.monto_fijo),
            float(n.total),
            n.estado,
            str(n.fecha_pago) if n.fecha_pago else "",
        ]
        for n in data.nominas
    ]
    headers = [
        "ID Nómina", "Trabajador", "Documento", "Tipo Pago",
        "Período Inicio", "Período Fin", "Piezas Producidas",
        "Monto Producción", "Monto Fijo", "Total USD", "Estado", "Fecha Pago",
    ]
    fi = fecha_inicio or _default_range()[0]
    ff = fecha_fin or _default_range()[1]
    return _csv_response(rows, headers, f"nominas_{fi}_{ff}.csv")

