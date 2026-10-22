import pytest
from httpx import AsyncClient


# ─────────────────────────────────────────────
# Fixture helper: crea pedido completo con anticipo >= 30%
# ─────────────────────────────────────────────
async def _crear_pedido_completo(client, headers, admin_headers, cliente_id, variante_id, anticipo_pct=0.35):
    """Crea un pedido de 5 prendas a $50,000 c/u = $250,000 total."""
    total = 250000.00
    anticipo = total * anticipo_pct
    ped_res = await client.post(
        "/api/v1/pedidos",
        json={
            "cliente_id": cliente_id,
            "descuento": "0.00",
            "anticipo": str(anticipo),
            "lineas": [
                {"variante_id": variante_id, "cantidad": 5, "precio_unitario": "50000.00"}
            ],
        },
        headers=admin_headers,
    )
    assert ped_res.status_code == 201
    return ped_res.json()


@pytest.mark.asyncio
async def test_reporte_ventas_estructura(client: AsyncClient, create_test_users):
    """Verifica que el reporte de ventas retorne la estructura esperada."""
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Crear cliente, producto y pedido base
    cli = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Rep. Ventas SA", "documento": "900100200-1", "credito_maximo": "5000000.00", "activo": True},
        headers=admin_headers,
    )
    cliente_id = cli.json()["id"]

    prod = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "CAM-REP",
            "nombre": "Camisa Reportes",
            "tipo": "camisa",
            "precio_base": "50000.00",
            "variantes_iniciales": [{"color": "Verde", "talla": "S", "stock": 50}],
        },
        headers=admin_headers,
    )
    var_id = prod.json()["variantes"][0]["id"]

    await _crear_pedido_completo(client, admin_headers, admin_headers, cliente_id, var_id)

    res = await client.get("/api/v1/reportes/ventas", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    required = ["fecha_inicio", "fecha_fin", "total_pedidos", "total_facturado",
                "total_cobrado", "total_cartera", "por_cliente", "por_producto", "por_vendedor"]
    for field in required:
        assert field in data, f"Faltante: {field}"

    assert data["total_pedidos"] >= 1
    assert float(data["total_facturado"]) > 0
    assert isinstance(data["por_cliente"], list)
    assert isinstance(data["por_producto"], list)
    assert isinstance(data["por_vendedor"], list)


@pytest.mark.asyncio
async def test_reporte_produccion_estructura(client: AsyncClient, create_test_users):
    """Verifica que el reporte de producción retorne la estructura esperada."""
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res = await client.get("/api/v1/reportes/produccion", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    required = [
        "fecha_inicio", "fecha_fin",
        "total_ordenes_corte", "total_ordenes_impresion", "total_ordenes_confeccion",
        "costo_total_produccion", "por_operario", "por_tecnica_impresion",
    ]
    for field in required:
        assert field in data, f"Faltante: {field}"

    assert isinstance(data["por_operario"], list)
    assert isinstance(data["por_tecnica_impresion"], list)


@pytest.mark.asyncio
async def test_reporte_rentabilidad_con_pedido(client: AsyncClient, create_test_users):
    """
    Crea un pedido confirmado y verifica que aparezca en el reporte de rentabilidad
    con los campos de ganancia y margen calculados.
    """
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Crear cliente + producto
    cli = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Rentabilidad C.A.", "documento": "J-30111222-2", "credito_maximo": "4000000.00", "activo": True},
        headers=admin_headers,
    )
    cliente_id = cli.json()["id"]

    prod = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "PANT-RENT",
            "nombre": "Pantalón Rentabilidad",
            "tipo": "pantalon",
            "precio_base": "50000.00",
            "variantes_iniciales": [{"color": "Negro", "talla": "M", "stock": 50}],
        },
        headers=admin_headers,
    )
    var_id = prod.json()["variantes"][0]["id"]

    # Pedido con anticipo >=30%: $250,000 total, $100,000 anticipo (40%)
    ped = await _crear_pedido_completo(client, admin_headers, admin_headers, cliente_id, var_id, anticipo_pct=0.40)
    # Con anticipo >= 30% el pedido se crea directamente en 'confirmado'
    # (PENDIENTE_CORTE se activa cuando un pago adicional desbloquea un borrador)
    assert ped["estado"] in ("confirmado", "pendiente_corte")

    # Verificar reporte de rentabilidad
    res = await client.get("/api/v1/reportes/rentabilidad", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    required = [
        "fecha_inicio", "fecha_fin", "total_facturado", "total_cobrado",
        "costo_total_produccion", "ganancia_bruta_total", "margen_promedio", "pedidos",
    ]
    for field in required:
        assert field in data, f"Faltante: {field}"

    assert len(data["pedidos"]) >= 1
    pedido_rep = next((p for p in data["pedidos"] if p["pedido_id"] == ped["id"]), None)
    assert pedido_rep is not None, "El pedido creado no aparece en el reporte de rentabilidad"
    assert float(pedido_rep["total_facturado"]) == 250000.0
    assert "margen_porcentaje" in pedido_rep
    assert "ganancia_bruta" in pedido_rep


@pytest.mark.asyncio
async def test_reporte_morosidad(client: AsyncClient, create_test_users):
    """
    Crea un pedido confirmado con saldo pendiente y verifica que aparezca
    en el reporte de morosidad.
    """
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Crear cliente con cupo limitado
    cli = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Moroso Test C.A.", "documento": "J-30099911-3", "credito_maximo": "500000.00", "activo": True},
        headers=admin_headers,
    )
    cliente_id = cli.json()["id"]

    prod = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "BOLSO-MOR",
            "nombre": "Bolso Morosidad",
            "tipo": "bolso",
            "precio_base": "50000.00",
            "variantes_iniciales": [{"color": "Rojo", "talla": "Único", "stock": 20}],
        },
        headers=admin_headers,
    )
    var_id = prod.json()["variantes"][0]["id"]

    # Pedido con anticipo 35% → saldo pendiente existe
    ped = await _crear_pedido_completo(client, admin_headers, admin_headers, cliente_id, var_id, anticipo_pct=0.35)
    assert float(ped["saldo_pendiente"]) > 0

    res = await client.get("/api/v1/reportes/morosidad", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()

    assert "total_clientes_morosos" in data
    assert "total_deuda_vencida" in data
    assert "clientes" in data
    assert isinstance(data["clientes"], list)
    assert data["total_clientes_morosos"] >= 1
    assert float(data["total_deuda_vencida"]) > 0

    entrada = next((c for c in data["clientes"] if c["pedido_id"] == ped["id"]), None)
    assert entrada is not None, "El pedido con saldo no aparece en el reporte de morosidad"
    assert float(entrada["saldo_pedido"]) > 0
    assert entrada["alerta"] in ("normal", "alerta", "bloqueado")


@pytest.mark.asyncio
async def test_exportar_csv_ventas(client: AsyncClient, create_test_users):
    """Verifica que la exportación CSV de ventas retorne Content-Type text/csv."""
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res = await client.get("/api/v1/reportes/ventas/csv", headers=admin_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "attachment" in res.headers.get("content-disposition", "")


@pytest.mark.asyncio
async def test_reportes_bloqueados_para_vendedor(client: AsyncClient, create_test_users):
    """Verifica que los reportes estén restringidos a administrador y superusuario."""
    vendedor_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    token = vendedor_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    for endpoint in ["/api/v1/reportes/ventas", "/api/v1/reportes/produccion",
                     "/api/v1/reportes/rentabilidad", "/api/v1/reportes/morosidad"]:
        res = await client.get(endpoint, headers=headers)
        assert res.status_code == 403, f"Endpoint {endpoint} debería retornar 403 para vendedor"
