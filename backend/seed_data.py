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

if __name__ == "__main__":
    asyncio.run(seed_semana_2())
