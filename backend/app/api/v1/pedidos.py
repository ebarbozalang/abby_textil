from typing import List, Optional
from decimal import Decimal
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import RolUsuario, Usuario
from app.models.cliente import Cliente
from app.models.producto import Variante
from app.models.pedido import Pedido, LineaPedido, HistorialPedido, EstadoPedido
from app.schemas.pedido import (
    PedidoCreate,
    PedidoOut,
    CambioEstadoPedido,
    LineaPedidoOut,
)

router = APIRouter(prefix="/pedidos", tags=["Ventas & Pedidos"])


@router.get("", response_model=List[PedidoOut])
async def list_pedidos(
    estado: Optional[EstadoPedido] = Query(None, description="Filtrar por estado de pedido"),
    cliente_id: Optional[int] = Query(None, description="Filtrar por cliente"),
    q: Optional[str] = Query(None, description="Búsqueda por # Pedido, notas o cliente"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista todos los pedidos con sus líneas de producción y estado financiero."""
    query = (
        select(Pedido)
        .options(
            selectinload(Pedido.cliente),
            selectinload(Pedido.vendedor),
            selectinload(Pedido.lineas).selectinload(LineaPedido.variante),
            selectinload(Pedido.historial),
        )
    )

    if estado:
        query = query.where(Pedido.estado == estado)
    if cliente_id:
        query = query.where(Pedido.cliente_id == cliente_id)
    if q:
        search = f"%{q.strip()}%"
        # Si es numérico, buscar por ID directo
        if q.strip().isdigit():
            query = query.where(
                or_(
                    Pedido.id == int(q.strip()),
                    Pedido.notas.ilike(search),
                )
            )
        else:
            query = query.where(Pedido.notas.ilike(search))

    query = query.order_by(Pedido.id.desc())
    result = await db.execute(query)
    pedidos = result.scalars().all()
    return pedidos


@router.post("", response_model=PedidoOut, status_code=status.HTTP_201_CREATED)
async def create_pedido(
    pedido_in: PedidoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """
    Crea un pedido bajo pedido validando:
    1. Existencia del cliente y estado activo.
    2. Existencia de cada variante SKU.
    3. Validación de límite de crédito del cliente.
    4. Cálculo de anticipo obligatorio (mínimo 30%).
    5. Generación de código de rastreo único por cada línea.
    """
    # 1. Validar cliente
    cliente_q = select(Cliente).where(Cliente.id == pedido_in.cliente_id)
    cliente = (await db.execute(cliente_q)).scalar_one_or_none()
    if not cliente or not cliente.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cliente no encontrado o inactivo para facturación",
        )

    # 2. Validar variantes y calcular subtotal
    subtotal = Decimal("0.00")
    lineas_preparadas = []

    for idx, l in enumerate(pedido_in.lineas, start=1):
        var_q = select(Variante).where(Variante.id == l.variante_id)
        variante = (await db.execute(var_q)).scalar_one_or_none()
        if not variante:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Variante con ID {l.variante_id} no existe en el catálogo",
            )

        linea_subtotal = Decimal(str(l.cantidad)) * Decimal(str(l.precio_unitario))
        subtotal += linea_subtotal
        lineas_preparadas.append({
            "variante": variante,
            "cantidad": l.cantidad,
            "precio_unitario": l.precio_unitario,
            "subtotal": linea_subtotal,
            "seq": idx,
        })

    # 3. Cálculos financieros
    descuento = Decimal(str(pedido_in.descuento))
    total = max(Decimal("0.00"), subtotal - descuento)
    anticipo = Decimal(str(pedido_in.anticipo))
    saldo_pendiente = max(Decimal("0.00"), total - anticipo)

    # 4. Validación de cupo de crédito del cliente
    nuevo_saldo_global = Decimal(str(cliente.saldo_pendiente_global)) + saldo_pendiente
    credito_max = Decimal(str(cliente.credito_maximo))

    if saldo_pendiente > 0 and nuevo_saldo_global > credito_max:
        exceso = nuevo_saldo_global - credito_max
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Bloqueo por Cupo de Crédito: El saldo pendiente resultante (${nuevo_saldo_global:,.2f}) "
                f"supera el cupo máximo del cliente (${credito_max:,.2f}) en ${exceso:,.2f}. "
                f"Se requiere un anticipo mínimo de ${saldo_pendiente - exceso + Decimal('1.00'):,.2f} para aprobar el pedido."
            ),
        )

    # 5. Validación de anticipo obligatorio para iniciar producción
    # Regla: Mínimo 30% (configurable)
    porcentaje_anticipo = (float(anticipo) / float(total) * 100) if total > 0 else 100.0
    anticipo_min_req = total * Decimal(str(settings.ANTICIPO_MINIMO_PORCENTAJE / 100.0))

    if anticipo >= anticipo_min_req:
        estado_inicial = EstadoPedido.CONFIRMADO
    else:
        estado_inicial = EstadoPedido.BORRADOR

    # Crear Pedido en BD
    nuevo_pedido = Pedido(
        cliente_id=cliente.id,
        vendedor_id=current_user.id,
        fecha=date.today(),
        estado=estado_inicial,
        subtotal=subtotal,
        descuento=descuento,
        total=total,
        anticipo=anticipo,
        saldo_pendiente=saldo_pendiente,
        fecha_entrega_estimada=pedido_in.fecha_entrega_estimada,
        notas=pedido_in.notas,
    )
    db.add(nuevo_pedido)
    await db.flush()  # Para obtener el ID del pedido

    # 6. Crear Líneas con Códigos de Rastreo Únicos
    for item in lineas_preparadas:
        cod_rastreo = LineaPedido.generar_codigo_rastreo(
            nuevo_pedido.id,
            item["variante"].sku_unico,
            item["seq"]
        )
        linea = LineaPedido(
            pedido_id=nuevo_pedido.id,
            variante_id=item["variante"].id,
            cantidad=item["cantidad"],
            precio_unitario=item["precio_unitario"],
            subtotal=item["subtotal"],
            estado_produccion="pendiente_corte",
            codigo_rastreo_unico=cod_rastreo,
        )
        db.add(linea)

    # 7. Actualizar cartera del cliente
    cliente.saldo_pendiente_global = nuevo_saldo_global

    # 8. Registrar auditoría inicial
    observacion_inicial = (
        f"Pedido creado con anticipo del {porcentaje_anticipo:.1f}% (${anticipo:,.0f}). "
        f"Estado: {estado_inicial.value}."
    )
    if estado_inicial == EstadoPedido.BORRADOR:
        observacion_inicial += f" Anticipo menor al {settings.ANTICIPO_MINIMO_PORCENTAJE}% requerido."

    historial = HistorialPedido(
        pedido_id=nuevo_pedido.id,
        usuario_id=current_user.id,
        estado_anterior=None,
        estado_nuevo=estado_inicial.value,
        observacion=observacion_inicial,
    )
    db.add(historial)

    await db.commit()
    q_ret = (
        select(Pedido)
        .where(Pedido.id == nuevo_pedido.id)
        .options(
            selectinload(Pedido.cliente),
            selectinload(Pedido.vendedor),
            selectinload(Pedido.lineas).selectinload(LineaPedido.variante),
            selectinload(Pedido.historial),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


@router.get("/{pedido_id}", response_model=PedidoOut)
async def get_pedido(
    pedido_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Obtiene el detalle completo de un pedido, sus prendas y su trazabilidad histórica."""
    query = (
        select(Pedido)
        .where(Pedido.id == pedido_id)
        .options(
            selectinload(Pedido.cliente),
            selectinload(Pedido.vendedor),
            selectinload(Pedido.lineas).selectinload(LineaPedido.variante),
            selectinload(Pedido.historial),
        )
    )
    result = await db.execute(query)
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
        )
    return pedido


@router.put("/{pedido_id}/estado", response_model=PedidoOut)
async def change_pedido_estado(
    pedido_id: int,
    cambio: CambioEstadoPedido,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.VENDEDOR, RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO)
    ),
):
    """
    Cambia el estado de un pedido aplicando reglas de negocio:
    - Para salir de 'borrador' a 'confirmado' o producción se exige anticipo >= 30%.
    - Todo cambio se audita en el historial.
    """
    query = select(Pedido).where(Pedido.id == pedido_id)
    pedido = (await db.execute(query)).scalar_one_or_none()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado",
        )

    # Regla: Si está en borrador y se intenta pasar a producción sin anticipo mínimo
    if pedido.estado == EstadoPedido.BORRADOR and cambio.nuevo_estado in [
        EstadoPedido.CONFIRMADO,
        EstadoPedido.PENDIENTE_CORTE,
        EstadoPedido.EN_CORTE,
    ]:
        if not pedido.cumple_anticipo_minimo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Anticipo Insuficiente: El pedido solo tiene abonado el {pedido.porcentaje_anticipo:.1f}%. "
                    f"Se requiere mínimo el {settings.ANTICIPO_MINIMO_PORCENTAJE}% para iniciar producción."
                ),
            )

    estado_anterior = pedido.estado.value
    pedido.estado = cambio.nuevo_estado

    # Si se cancela el pedido, liberar el saldo en la cartera del cliente
    if cambio.nuevo_estado == EstadoPedido.CANCELADO and estado_anterior != EstadoPedido.CANCELADO.value:
        cliente_q = select(Cliente).where(Cliente.id == pedido.cliente_id)
        cliente = (await db.execute(cliente_q)).scalar_one_or_none()
        if cliente:
            cliente.saldo_pendiente_global = max(
                Decimal("0.00"),
                Decimal(str(cliente.saldo_pendiente_global)) - Decimal(str(pedido.saldo_pendiente)),
            )

    # Auditoría
    obs = cambio.observacion or f"Cambio de estado por usuario {current_user.nombre}"
    historial = HistorialPedido(
        pedido_id=pedido.id,
        usuario_id=current_user.id,
        estado_anterior=estado_anterior,
        estado_nuevo=cambio.nuevo_estado.value,
        observacion=obs,
    )
    db.add(historial)

    await db.commit()
    q_ret = (
        select(Pedido)
        .where(Pedido.id == pedido.id)
        .options(
            selectinload(Pedido.cliente),
            selectinload(Pedido.vendedor),
            selectinload(Pedido.lineas).selectinload(LineaPedido.variante),
            selectinload(Pedido.historial),
        )
    )
    return (await db.execute(q_ret)).scalar_one()


@router.get("/rastreo/{codigo_rastreo}", response_model=LineaPedidoOut)
async def get_linea_por_rastreo(
    codigo_rastreo: str,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Consulta directa por Código de Rastreo Único (usado al escanear QR en las máquinas de corte/confección).
    """
    query = (
        select(LineaPedido)
        .where(LineaPedido.codigo_rastreo_unico == codigo_rastreo.strip().upper())
        .options(selectinload(LineaPedido.variante))
    )
    linea = (await db.execute(query)).scalar_one_or_none()
    if not linea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ninguna prenda asociada al código de rastreo '{codigo_rastreo}'",
        )
    return linea
