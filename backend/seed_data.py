import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.cliente import Cliente
from app.models.producto import Producto, TipoProducto, Variante

async def seed_semana_2():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Clientes iniciales
        clientes_demo = [
            {
                "nombre": "Confecciones & Modas La 33",
                "documento": "901234567-8",
                "telefono": "+57 310 456 7890",
                "direccion": "Cra 33 # 45-12, Medellín",
                "email": "contacto@modasla33.com",
                "credito_maximo": Decimal("5000000.00"),
                "saldo_pendiente_global": Decimal("1200000.00"),
            },
            {
                "nombre": "Almacenes El Éxito Deportivo",
                "documento": "900876543-2",
                "telefono": "+57 320 876 5432",
                "direccion": "Calle 70 # 10-25, Cali",
                "email": "ventas@exitodeportivo.com",
                "credito_maximo": Decimal("10000000.00"),
                "saldo_pendiente_global": Decimal("3500000.00"),
            },
            {
                "nombre": "Distribuidora Boutique Chic",
                "documento": "1098765432",
                "telefono": "+57 300 234 5678",
                "direccion": "Av. Santander # 15-40, Bucaramanga",
                "email": "boutiquechic@gmail.com",
                "credito_maximo": Decimal("2000000.00"),
                "saldo_pendiente_global": Decimal("1950000.00"),  # Cerca al límite (97.5%)
            },
        ]

        for c in clientes_demo:
            q = select(Cliente).where(Cliente.documento == c["documento"])
            if not (await session.execute(q)).scalar_one_or_none():
                session.add(Cliente(**c, activo=True))

        # 2. Catálogo & Prendas con Variantes y SKU Único
        productos_demo = [
            {
                "codigo": "CAM-OXF",
                "nombre": "Camisa Oxford Clásica",
                "tipo": TipoProducto.CAMISA,
                "descripcion": "Camisa formal manga larga 100% algodón, corte slim fit.",
                "precio_base": Decimal("75000.00"),
                "variantes": [
                    {"color": "Blanco", "talla": "S", "stock": 25},
                    {"color": "Blanco", "talla": "M", "stock": 40},
                    {"color": "Blanco", "talla": "L", "stock": 35},
                    {"color": "Azul Celeste", "talla": "M", "stock": 30},
                    {"color": "Azul Celeste", "talla": "L", "stock": 20},
                ],
            },
            {
                "codigo": "CONJ-DEP-DAM",
                "nombre": "Conjunto Deportivo Dama (Top + Leggings)",
                "tipo": TipoProducto.CONJUNTO_DAMA,
                "descripcion": "Tela suplex inteligente de alta compresión y secado rápido.",
                "precio_base": Decimal("120000.00"),
                "variantes": [
                    {"color": "Negro", "talla": "S", "stock": 18},
                    {"color": "Negro", "talla": "M", "stock": 28},
                    {"color": "Vinotinto", "talla": "S", "stock": 15},
                    {"color": "Vinotinto", "talla": "M", "stock": 22},
                ],
            },
            {
                "codigo": "PAN-DRILL-CAB",
                "nombre": "Pantalón Drill Confort Caballero",
                "tipo": TipoProducto.PANTALON,
                "descripcion": "Drill licrado semi-formal con doble costura reforzada.",
                "precio_base": Decimal("90000.00"),
                "variantes": [
                    {"color": "Beige", "talla": "30", "stock": 15},
                    {"color": "Beige", "talla": "32", "stock": 25},
                    {"color": "Azul Oscuro", "talla": "32", "stock": 30},
                    {"color": "Azul Oscuro", "talla": "34", "stock": 20},
                ],
            },
            {
                "codigo": "BOL-LONA",
                "nombre": "Bolso Deportivo en Lona Reforzada",
                "tipo": TipoProducto.BOLSO,
                "descripcion": "Bolso multiuso con compartimento para calzado e impermeable.",
                "precio_base": Decimal("65000.00"),
                "variantes": [
                    {"color": "Negro", "talla": "UNICA", "stock": 50},
                    {"color": "Gris", "talla": "UNICA", "stock": 35},
                ],
            },
        ]

        for p_data in productos_demo:
            variantes_data = p_data.pop("variantes")
            q_p = select(Producto).where(Producto.codigo == p_data["codigo"])
            prod_db = (await session.execute(q_p)).scalar_one_or_none()
            if not prod_db:
                prod_db = Producto(**p_data, activo=True)
                session.add(prod_db)
                await session.flush()

                for v in variantes_data:
                    sku = Variante.generar_sku(prod_db.codigo, v["color"], v["talla"])
                    var_db = Variante(
                        producto_id=prod_db.id,
                        color=v["color"],
                        talla=v["talla"],
                        sku_unico=sku,
                        stock=v["stock"]
                    )
                    session.add(var_db)

        await session.commit()
        print("[OK] Datos iniciales de Clientes y Catálogo sembrados exitosamente.")

        # 3. Pedidos de Demostración con Códigos de Rastreo Único
        from app.models.pedido import Pedido, LineaPedido, HistorialPedido, EstadoPedido
        from app.models.usuario import Usuario

        # Obtener vendedor admin
        user_vendedor = (await session.execute(select(Usuario))).scalars().first()
        cliente_1 = (await session.execute(select(Cliente).where(Cliente.documento == "901234567-8"))).scalar_one_or_none()
        cliente_2 = (await session.execute(select(Cliente).where(Cliente.documento == "900876543-2"))).scalar_one_or_none()
        variante_cam = (await session.execute(select(Variante).where(Variante.sku_unico.like("CAMOXF%")))).scalars().first()
        variante_conj = (await session.execute(select(Variante).where(Variante.sku_unico.like("CONJDEPDAM%")))).scalars().first()

        pedidos_existentes = (await session.execute(select(Pedido))).scalars().all()
        if not pedidos_existentes and cliente_1 and cliente_2 and variante_cam and variante_conj and user_vendedor:
            # Pedido 1: Confirmado con 50% anticipo
            p1 = Pedido(
                cliente_id=cliente_1.id,
                vendedor_id=user_vendedor.id,
                estado=EstadoPedido.CONFIRMADO,
                subtotal=Decimal("1500000.00"),
                descuento=Decimal("0.00"),
                total=Decimal("1500000.00"),
                anticipo=Decimal("750000.00"),
                saldo_pendiente=Decimal("750000.00"),
                notas="Dotación ejecutiva para personal de ventas",
            )
            session.add(p1)
            await session.flush()

            linea1 = LineaPedido(
                pedido_id=p1.id,
                variante_id=variante_cam.id,
                cantidad=20,
                precio_unitario=Decimal("75000.00"),
                subtotal=Decimal("1500000.00"),
                estado_produccion="pendiente_corte",
                codigo_rastreo_unico=LineaPedido.generar_codigo_rastreo(p1.id, variante_cam.sku_unico, 1),
            )
            session.add(linea1)

            h1 = HistorialPedido(
                pedido_id=p1.id,
                usuario_id=user_vendedor.id,
                estado_anterior=None,
                estado_nuevo=EstadoPedido.CONFIRMADO.value,
                observacion="Pedido registrado con 50% de anticipo ($750.000)",
            )
            session.add(h1)

            # Pedido 2: En Corte con 40% anticipo
            p2 = Pedido(
                cliente_id=cliente_2.id,
                vendedor_id=user_vendedor.id,
                estado=EstadoPedido.PENDIENTE_CORTE,
                subtotal=Decimal("2400000.00"),
                descuento=Decimal("0.00"),
                total=Decimal("2400000.00"),
                anticipo=Decimal("960000.00"),
                saldo_pendiente=Decimal("1440000.00"),
                notas="Conjuntos deportivos para club atlético",
            )
            session.add(p2)
            await session.flush()

            linea2 = LineaPedido(
                pedido_id=p2.id,
                variante_id=variante_conj.id,
                cantidad=20,
                precio_unitario=Decimal("120000.00"),
                subtotal=Decimal("2400000.00"),
                estado_produccion="pendiente_corte",
                codigo_rastreo_unico=LineaPedido.generar_codigo_rastreo(p2.id, variante_conj.sku_unico, 1),
            )
            session.add(linea2)

            h2 = HistorialPedido(
                pedido_id=p2.id,
                usuario_id=user_vendedor.id,
                estado_anterior="confirmado",
                estado_nuevo=EstadoPedido.PENDIENTE_CORTE.value,
                observacion="Aprobado y enviado a orden de corte",
            )
            session.add(h2)

            await session.commit()
            print("[OK] Pedidos de demostración sembrados con trazabilidad y códigos de rastreo único.")

        # 4. Trabajadores y Órdenes de Producción
        from app.models.trabajador import Trabajador, TipoPago
        from app.models.produccion import (
            OrdenCorte,
            OrdenImpresion,
            OrdenConfeccion,
            EstadoEtapaProduccion,
            TecnicaImpresion,
            EtapaImpresion,
        )

        trabajadores_existentes = (await session.execute(select(Trabajador))).scalars().all()
        if not trabajadores_existentes:
            t1 = Trabajador(nombre="Carlos Cortador", documento="1001001", telefono="+57 311 000 1111", tipo_pago=TipoPago.PRODUCCION, activo=True)
            t2 = Trabajador(nombre="Ana Técnica DTF", documento="1001002", telefono="+57 311 000 2222", tipo_pago=TipoPago.PRODUCCION, activo=True)
            t3 = Trabajador(nombre="Pedro Confeccionista", documento="1001003", telefono="+57 311 000 3333", tipo_pago=TipoPago.PRODUCCION, activo=True)
            session.add_all([t1, t2, t3])
            await session.flush()

            # Obtener líneas de pedido
            lineas = (await session.execute(select(LineaPedido))).scalars().all()
            if len(lineas) >= 2:
                # Orden de Corte en proceso para línea 2
                oc = OrdenCorte(
                    pedido_id=lineas[1].pedido_id,
                    linea_pedido_id=lineas[1].id,
                    cortador_id=t1.id,
                    cantidad_piezas=lineas[1].cantidad,
                    costo_unitario=Decimal("1500.00"),
                    total=Decimal(str(lineas[1].cantidad * 1500)),
                    estado=EstadoEtapaProduccion.EN_PROCESO,
                    observaciones="Corte de conjuntos deportivos dama",
                )
                session.add(oc)

                # Orden de Corte TERMINADA para línea 1
                oc1 = OrdenCorte(
                    pedido_id=lineas[0].pedido_id,
                    linea_pedido_id=lineas[0].id,
                    cortador_id=t1.id,
                    cantidad_piezas=lineas[0].cantidad,
                    costo_unitario=Decimal("1500.00"),
                    total=Decimal(str(lineas[0].cantidad * 1500)),
                    estado=EstadoEtapaProduccion.TERMINADO,
                    observaciones="Corte completo de camisas Oxford",
                )
                session.add(oc1)

                # Orden de Impresión DTF en proceso para línea 1
                oi = OrdenImpresion(
                    pedido_id=lineas[0].pedido_id,
                    linea_pedido_id=lineas[0].id,
                    tecnico_id=t2.id,
                    tecnica=TecnicaImpresion.DTF,
                    cantidad=lineas[0].cantidad,
                    costo_unitario=Decimal("3000.00"),
                    total=Decimal(str(lineas[0].cantidad * 3000)),
                    etapa=EtapaImpresion.ANTES_COSTURA,
                    estado=EstadoEtapaProduccion.EN_PROCESO,
                    observaciones="Estampado DTF pecho izquierdo",
                )
                session.add(oi)

                # Orden de Confección en proceso para línea 1
                conf = OrdenConfeccion(
                    pedido_id=lineas[0].pedido_id,
                    linea_pedido_id=lineas[0].id,
                    operador_id=t3.id,
                    cantidad_prendas=lineas[0].cantidad,
                    costo_unitario=Decimal("5000.00"),
                    total=Decimal(str(lineas[0].cantidad * 5000)),
                    estado=EstadoEtapaProduccion.EN_PROCESO,
                    observaciones="Ensamble de cuellos y mangas",
                )
                session.add(conf)

            await session.commit()
            print("[OK] Trabajadores y órdenes de producción de demostración sembrados.")

if __name__ == "__main__":
    asyncio.run(seed_semana_2())
