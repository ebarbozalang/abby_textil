from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario, RolUsuario
from app.models.pedido import Pedido, EstadoPedido, LineaPedido
from app.models.produccion import OrdenCorte, OrdenImpresion, OrdenConfeccion, EstadoEtapaProduccion
from app.models.trabajador import Trabajador, ProduccionDiaria, Nomina, EstadoNomina
from app.models.tesoreria import Pago, AbonoCredito
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/dashboard", tags=["Dashboard & KPIs"])


class KpiDashboardOut(BaseModel):
    # Pedidos
    pedidos_hoy: int
    pedidos_en_produccion: int
    pedidos_pendientes_cobro: int
    pedidos_entregados_mes: int
    # Recaudo
    recaudo_hoy: Decimal
    recaudo_mes: Decimal
    cartera_total: Decimal
    # Producción en curso
    ordenes_corte_activas: int
    ordenes_impresion_activas: int
    ordenes_confeccion_activas: int
    # Alertas
    alertas_anticipo_insuficiente: int
    alertas_credito_excedido: int


class AlertaItem(BaseModel):
    tipo: str
    mensaje: str
    severidad: str  # 'alta', 'media', 'baja'
    referencia_id: Optional[int] = None


class DashboardOut(BaseModel):
    kpis: KpiDashboardOut
    alertas: List[AlertaItem]

    model_config = ConfigDict(from_attributes=True)


@router.get(
    "/",
    response_model=DashboardOut,
    dependencies=[Depends(require_role(
        RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO
    ))],
)
async def obtener_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Retorna los KPIs principales del dashboard y alertas activas del sistema.
    """
    hoy = date.today()
    inicio_mes = date(hoy.year, hoy.month, 1)

    # --- PEDIDOS ---
    pedidos_hoy_res = await db.execute(
        select(func.count(Pedido.id)).where(Pedido.fecha == hoy)
    )
    pedidos_hoy = pedidos_hoy_res.scalar() or 0

    estados_produccion = [
        EstadoPedido.PENDIENTE_CORTE, EstadoPedido.EN_CORTE,
        EstadoPedido.PENDIENTE_IMPRESION, EstadoPedido.EN_IMPRESION,
        EstadoPedido.PENDIENTE_CONFECCION, EstadoPedido.EN_CONFECCION,
        EstadoPedido.CONTROL_CALIDAD,
    ]
    ped_prod_res = await db.execute(
        select(func.count(Pedido.id)).where(Pedido.estado.in_(estados_produccion))
    )
    pedidos_en_produccion = ped_prod_res.scalar() or 0

    ped_cobro_res = await db.execute(
        select(func.count(Pedido.id)).where(
            and_(
                Pedido.saldo_pendiente > Decimal("0.00"),
                Pedido.estado != EstadoPedido.CANCELADO,
                Pedido.estado != EstadoPedido.BORRADOR,
            )
        )
    )
    pedidos_pendientes_cobro = ped_cobro_res.scalar() or 0

    ped_entregados_res = await db.execute(
        select(func.count(Pedido.id)).where(
            and_(
                Pedido.estado == EstadoPedido.ENTREGADO,
                Pedido.fecha >= inicio_mes,
            )
        )
    )
    pedidos_entregados_mes = ped_entregados_res.scalar() or 0

    # --- RECAUDO ---
    recaudo_hoy_res = await db.execute(
        select(func.coalesce(func.sum(Pago.monto), Decimal("0.00"))).where(Pago.fecha == hoy)
    )
    recaudo_hoy = recaudo_hoy_res.scalar() or Decimal("0.00")

    abonos_hoy_res = await db.execute(
        select(func.coalesce(func.sum(AbonoCredito.monto), Decimal("0.00"))).where(AbonoCredito.fecha == hoy)
    )
    abonos_hoy = abonos_hoy_res.scalar() or Decimal("0.00")
    recaudo_hoy_total = Decimal(str(recaudo_hoy)) + Decimal(str(abonos_hoy))

    recaudo_mes_res = await db.execute(
        select(func.coalesce(func.sum(Pago.monto), Decimal("0.00"))).where(Pago.fecha >= inicio_mes)
    )
    recaudo_mes_pagos = recaudo_mes_res.scalar() or Decimal("0.00")

    abonos_mes_res = await db.execute(
        select(func.coalesce(func.sum(AbonoCredito.monto), Decimal("0.00"))).where(
            AbonoCredito.fecha >= inicio_mes
        )
    )
    abonos_mes = abonos_mes_res.scalar() or Decimal("0.00")
    recaudo_mes_total = Decimal(str(recaudo_mes_pagos)) + Decimal(str(abonos_mes))

    cartera_res = await db.execute(
        select(func.coalesce(func.sum(Pedido.saldo_pendiente), Decimal("0.00"))).where(
            and_(
                Pedido.saldo_pendiente > Decimal("0.00"),
                Pedido.estado != EstadoPedido.CANCELADO,
            )
        )
    )
    cartera_total = cartera_res.scalar() or Decimal("0.00")

    # --- PRODUCCIÓN ACTIVA ---
    corte_res = await db.execute(
        select(func.count(OrdenCorte.id)).where(
            OrdenCorte.estado == EstadoEtapaProduccion.EN_PROCESO
        )
    )
    ordenes_corte_activas = corte_res.scalar() or 0

    impresion_res = await db.execute(
        select(func.count(OrdenImpresion.id)).where(
            OrdenImpresion.estado == EstadoEtapaProduccion.EN_PROCESO
        )
    )
    ordenes_impresion_activas = impresion_res.scalar() or 0

    confeccion_res = await db.execute(
        select(func.count(OrdenConfeccion.id)).where(
            OrdenConfeccion.estado == EstadoEtapaProduccion.EN_PROCESO
        )
    )
    ordenes_confeccion_activas = confeccion_res.scalar() or 0

    # --- ALERTAS ---
    # Pedidos en borrador (anticipo < 30%)
    borradores_res = await db.execute(
        select(func.count(Pedido.id)).where(Pedido.estado == EstadoPedido.BORRADOR)
    )
    alertas_anticipo = borradores_res.scalar() or 0

    # Clientes con crédito excedido
    from app.models.cliente import Cliente
    credito_excedido_res = await db.execute(
        select(func.count(Cliente.id)).where(
            and_(
                Cliente.activo == True,
                Cliente.credito_maximo > Decimal("0.00"),
                Cliente.saldo_pendiente_global > Cliente.credito_maximo,
            )
        )
    )
    alertas_credito = credito_excedido_res.scalar() or 0

    kpis = KpiDashboardOut(
        pedidos_hoy=pedidos_hoy,
        pedidos_en_produccion=pedidos_en_produccion,
        pedidos_pendientes_cobro=pedidos_pendientes_cobro,
        pedidos_entregados_mes=pedidos_entregados_mes,
        recaudo_hoy=recaudo_hoy_total,
        recaudo_mes=recaudo_mes_total,
        cartera_total=Decimal(str(cartera_total)),
        ordenes_corte_activas=ordenes_corte_activas,
        ordenes_impresion_activas=ordenes_impresion_activas,
        ordenes_confeccion_activas=ordenes_confeccion_activas,
        alertas_anticipo_insuficiente=alertas_anticipo,
        alertas_credito_excedido=alertas_credito,
    )

    alertas: List[AlertaItem] = []
    if alertas_anticipo > 0:
        alertas.append(AlertaItem(
            tipo="anticipo",
            mensaje=f"{alertas_anticipo} pedido(s) en borrador esperando anticipo mínimo del 30% para iniciar producción.",
            severidad="alta",
        ))
    if alertas_credito > 0:
        alertas.append(AlertaItem(
            tipo="credito",
            mensaje=f"{alertas_credito} cliente(s) superaron su cupo de crédito asignado. Bloquear nuevos pedidos.",
            severidad="alta",
        ))
    if pedidos_pendientes_cobro > 0:
        alertas.append(AlertaItem(
            tipo="cobranza",
            mensaje=f"{pedidos_pendientes_cobro} pedido(s) confirmado(s) con saldo pendiente de cobro.",
            severidad="media",
        ))
    if ordenes_confeccion_activas + ordenes_corte_activas + ordenes_impresion_activas > 0:
        total_activas = ordenes_corte_activas + ordenes_impresion_activas + ordenes_confeccion_activas
        alertas.append(AlertaItem(
            tipo="produccion",
            mensaje=f"{total_activas} orden(es) de producción en proceso activo hoy.",
            severidad="baja",
        ))

    return DashboardOut(kpis=kpis, alertas=alertas)


# ─────────────────────────────────────────────
# Endpoints del Portal del Trabajador (datos reales)
# ─────────────────────────────────────────────
class TrabajadorPortalStats(BaseModel):
    trabajador_id: int
    nombre: str
    tipo_pago: str
    salario_fijo: Decimal
    hoy_piezas: int
    hoy_ganancia: Decimal
    semana_piezas: int
    semana_ganancia: Decimal
    mes_piezas: int
    mes_ganancia: Decimal


class NominaPortalOut(BaseModel):
    id: int
    periodo_inicio: date
    periodo_fin: date
    tipo: str
    total: Decimal
    estado: str
    fecha_pago: Optional[date] = None


@router.get(
    "/portal-trabajador",
    dependencies=[Depends(require_role(
        RolUsuario.TRABAJADOR, RolUsuario.SUPERUSUARIO
    ))],
)
async def mi_produccion(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Retorna las estadísticas de producción del trabajador autenticado.
    Solo muestra datos propios (piezas y ganancias). Sin acceso a precios ni clientes.
    """
    from app.models.trabajador import TipoPago

    # Buscar el trabajador vinculado al usuario
    trab_res = await db.execute(
        select(Trabajador).where(Trabajador.usuario_id == current_user.id)
    )
    trabajador = trab_res.scalar_one_or_none()

    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())  # Lunes de la semana actual
    inicio_mes = date(hoy.year, hoy.month, 1)

    if not trabajador:
        return {
            "trabajador_id": None,
            "nombre": current_user.nombre,
            "tipo_pago": "N/A",
            "salario_fijo": 0,
            "hoy_piezas": 0, "hoy_ganancia": 0,
            "semana_piezas": 0, "semana_ganancia": 0,
            "mes_piezas": 0, "mes_ganancia": 0,
            "nominas_recientes": [],
        }

    async def stats_periodo(fecha_inicio: date, fecha_fin: date):
        res = await db.execute(
            select(
                func.coalesce(func.sum(ProduccionDiaria.cantidad), 0),
                func.coalesce(func.sum(ProduccionDiaria.monto_generado), Decimal("0.00")),
            ).where(
                and_(
                    ProduccionDiaria.trabajador_id == trabajador.id,
                    ProduccionDiaria.fecha >= fecha_inicio,
                    ProduccionDiaria.fecha <= fecha_fin,
                )
            )
        )
        row = res.one()
        return int(row[0]), Decimal(str(row[1]))

    hoy_piezas, hoy_ganancia = await stats_periodo(hoy, hoy)
    semana_piezas, semana_ganancia = await stats_periodo(inicio_semana, hoy)
    mes_piezas, mes_ganancia = await stats_periodo(inicio_mes, hoy)

    # Últimas nóminas del trabajador
    nominas_res = await db.execute(
        select(Nomina)
        .where(Nomina.trabajador_id == trabajador.id)
        .order_by(desc(Nomina.periodo_fin))
        .limit(6)
    )
    nominas = nominas_res.scalars().all()
    nominas_out = [
        {
            "id": n.id,
            "periodo_inicio": n.periodo_inicio.isoformat(),
            "periodo_fin": n.periodo_fin.isoformat(),
            "tipo": n.tipo,
            "total": float(n.total),
            "estado": n.estado,
            "fecha_pago": n.fecha_pago.isoformat() if n.fecha_pago else None,
        }
        for n in nominas
    ]

    return {
        "trabajador_id": trabajador.id,
        "nombre": current_user.nombre,
        "tipo_pago": trabajador.tipo_pago,
        "salario_fijo": float(trabajador.salario_fijo),
        "hoy_piezas": hoy_piezas,
        "hoy_ganancia": float(hoy_ganancia),
        "semana_piezas": semana_piezas,
        "semana_ganancia": float(semana_ganancia),
        "mes_piezas": mes_piezas,
        "mes_ganancia": float(mes_ganancia),
        "nominas_recientes": nominas_out,
    }
