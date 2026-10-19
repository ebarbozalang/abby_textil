import pytest
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_flujo_pagos_anticipo_y_desbloqueo(client: AsyncClient, create_test_users):
    """
    Verifica que:
    1. Un pedido creado con <30% de anticipo queda en 'borrador'.
    2. Al registrar pagos hasta completar el 30%, el pedido se desbloquea automáticamente a 'pendiente_corte'.
    3. Al liquidar el saldo total, el saldo del pedido queda en cero.
    """
    # 1. Login vendedor y admin
    vendedor_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    vendedor_token = vendedor_res.json()["access_token"]
    vendedor_headers = {"Authorization": f"Bearer {vendedor_token}"}

    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Crear cliente
    cli_res = await client.post(
        "/api/v1/clientes",
        json={
            "nombre": "Confecciones La 10",
            "documento": "900555666-1",
            "telefono": "+57 300 777 8899",
            "credito_maximo": "5000000.00",
            "activo": True,
        },
        headers=admin_headers,
    )
    cliente_id = cli_res.json()["id"]

    # 3. Crear producto con variante
    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "CAM-CASUAL",
            "nombre": "Camisa Casual Lino",
            "tipo": "casual",
            "precio_base": "100000.00",
            "variantes_iniciales": [
                {"color": "Azul", "talla": "L", "stock": 50},
            ],
        },
        headers=admin_headers,
    )
    variante_id = prod_res.json()["variantes"][0]["id"]

    # 4. Crear pedido de $1,000,000 con $100,000 de anticipo (10% < 30%)
    pedido_res = await client.post(
        "/api/v1/pedidos",
        json={
            "cliente_id": cliente_id,
            "descuento": "0.00",
            "anticipo": "100000.00",
            "notas": "Pedido para prueba de anticipo gradual",
            "lineas": [
                {"variante_id": variante_id, "cantidad": 10, "precio_unitario": "100000.00"}
            ],
        },
        headers=vendedor_headers,
    )
    assert pedido_res.status_code == 201
    pedido = pedido_res.json()
    pedido_id = pedido["id"]
    assert pedido["estado"] == "borrador"
    assert float(pedido["saldo_pendiente"]) == 900000.00

    # 5. Registrar un primer pago por $100,000 (total acumulado: $200,000 = 20% < 30%)
    # Sigue en borrador
    pago_1_res = await client.post(
        "/api/v1/tesoreria/pagos",
        json={
            "pedido_id": pedido_id,
            "monto": "100000.00",
            "moneda_pago": "USD",
            "metodo": "efectivo_usd",
            "referencia": "REC-001",
        },
        headers=vendedor_headers,
    )
    assert pago_1_res.status_code == 201
    pago_1 = pago_1_res.json()
    assert float(pago_1["monto"]) == 100000.00

    ped_check_1 = await client.get(f"/api/v1/pedidos/{pedido_id}", headers=vendedor_headers)
    assert ped_check_1.json()["estado"] == "borrador"
    assert float(ped_check_1.json()["anticipo"]) == 200000.00
    assert float(ped_check_1.json()["saldo_pendiente"]) == 800000.00

    # 6. Registrar segundo pago por $150,000 (acumulado: $350,000 = 35% >= 30%)
    # Se debe desbloquear automáticamente a 'pendiente_corte'
    pago_2_res = await client.post(
        "/api/v1/tesoreria/pagos",
        json={
            "pedido_id": pedido_id,
            "monto": "150000.00",
            "moneda_pago": "USD",
            "metodo": "zelle",
            "referencia": "ZL-884920",
        },
        headers=vendedor_headers,
    )
    assert pago_2_res.status_code == 201

    ped_check_2 = await client.get(f"/api/v1/pedidos/{pedido_id}", headers=vendedor_headers)
    assert ped_check_2.json()["estado"] == "pendiente_corte"
    assert float(ped_check_2.json()["anticipo"]) == 350000.00
    assert float(ped_check_2.json()["saldo_pendiente"]) == 650000.00

    # 7. Liquidar el saldo restante ($650,000) por transferencia en bolívares
    pago_3_res = await client.post(
        "/api/v1/tesoreria/pagos",
        json={
            "pedido_id": pedido_id,
            "monto": "650000.00",
            "moneda_pago": "USD",
            "metodo": "transferencia_bs",
            "banco": "Banesco",
            "referencia": "TR-BANC-9921",
        },
        headers=vendedor_headers,
    )
    assert pago_3_res.status_code == 201

    ped_check_3 = await client.get(f"/api/v1/pedidos/{pedido_id}", headers=vendedor_headers)
    assert float(ped_check_3.json()["saldo_pendiente"]) == 0.00


@pytest.mark.asyncio
async def test_abonos_credito_y_cuentas_por_cobrar(client: AsyncClient, create_test_users):
    """
    Verifica registro de abonos a crédito del cliente,
    amortización de deuda y reporte de cuentas por cobrar.
    """
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Crear cliente con cupo de $2,000,000
    cli_res = await client.post(
        "/api/v1/clientes",
        json={
            "nombre": "Modas Europa Ltda",
            "documento": "830001999-4",
            "telefono": "+57 315 111 2233",
            "credito_maximo": "2000000.00",
            "activo": True,
        },
        headers=admin_headers,
    )
    cliente_id = cli_res.json()["id"]

    # Crear producto
    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "PANT-CHINO",
            "nombre": "Pantalón Chino",
            "tipo": "pantalon",
            "precio_base": "80000.00",
            "variantes_iniciales": [
                {"color": "Beige", "talla": "32", "stock": 40},
            ],
        },
        headers=admin_headers,
    )
    var_id = prod_res.json()["variantes"][0]["id"]

    # Crear pedido de 20 pantalones = $1,600,000 con anticipo 30% ($480,000), saldo = $1,120,000
    ped_res = await client.post(
        "/api/v1/pedidos",
        json={
            "cliente_id": cliente_id,
            "descuento": "0.00",
            "anticipo": "480000.00",
            "lineas": [
                {"variante_id": var_id, "cantidad": 20, "precio_unitario": "80000.00"}
            ],
        },
        headers=admin_headers,
    )
    pedido_id = ped_res.json()["id"]

    # Verificar que el cliente tiene saldo pendiente global = 1,120,000
    cli_info = await client.get(f"/api/v1/clientes/{cliente_id}", headers=admin_headers)
    assert float(cli_info.json()["saldo_pendiente_global"]) == 1120000.00

    # 2. Consultar Cuentas por Cobrar
    cpc_res = await client.get("/api/v1/tesoreria/cuentas-por-cobrar", headers=admin_headers)
    assert cpc_res.status_code == 200
    cpc_list = cpc_res.json()
    cliente_cpc = next((c for c in cpc_list if c["cliente_id"] == cliente_id), None)
    assert cliente_cpc is not None
    assert float(cliente_cpc["saldo_pendiente_global"]) == 1120000.00
    assert cliente_cpc["pedidos_pendientes_count"] == 1
    # 1.120.000 / 2.000.000 = 56% -> riesgo 'normal'
    assert cliente_cpc["alerta_riesgo"] == "normal"

    # 3. Registrar Abono a crédito vinculado al pedido en Pago Móvil
    abono_res = await client.post(
        "/api/v1/tesoreria/abonos",
        json={
            "cliente_id": cliente_id,
            "pedido_id": pedido_id,
            "monto": "500000.00",
            "moneda_pago": "USD",
            "metodo": "pago_movil",
            "banco": "Mercantil",
            "telefono": "04121234567",
            "referencia": "PM-10023",
            "notas": "Abono cuota 1",
        },
        headers=admin_headers,
    )
    assert abono_res.status_code == 201

    # Verificar nuevo saldo del cliente y del pedido
    cli_info_after = await client.get(f"/api/v1/clientes/{cliente_id}", headers=admin_headers)
    assert float(cli_info_after.json()["saldo_pendiente_global"]) == 620000.00

    ped_after = await client.get(f"/api/v1/pedidos/{pedido_id}", headers=admin_headers)
    assert float(ped_after.json()["saldo_pendiente"]) == 620000.00


@pytest.mark.asyncio
async def test_reporte_cierre_caja_diario(client: AsyncClient, create_test_users):
    """Verifica que el endpoint de cierre de caja consolide ingresos en USD y Bs."""
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    cierre_res = await client.get("/api/v1/tesoreria/cierre-caja", headers=admin_headers)
    assert cierre_res.status_code == 200
    data = cierre_res.json()

    assert "total_recaudado_usd" in data
    assert "total_recaudado_bs" in data
    assert "total_efectivo_usd" in data
    assert "total_pago_movil" in data
    assert "total_transferencias_bs" in data
    assert "desglose_metodos" in data
    assert "movimientos" in data
    assert isinstance(data["desglose_metodos"], list)


@pytest.mark.asyncio
async def test_tasa_bcv_y_pago_dual_bs_usd(client: AsyncClient, create_test_users):
    """
    Verifica:
    1. Consulta de tasa de cambio activa.
    2. Modificación manual de tasa de cambio.
    3. Pago realizado en Bolívares (BS) con conversión automática a USD y amortización correcta.
    """
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Establecer tasa manual a 50.00 Bs/$
    tasa_set = await client.post(
        "/api/v1/tasa/manual",
        json={"tasa": 50.00, "motivo": "Tasa fija para testing"},
        headers=admin_headers,
    )
    assert tasa_set.status_code == 200
    assert float(tasa_set.json()["tasa"]) == 50.00

    # 2. Consultar tasa activa
    tasa_get = await client.get("/api/v1/tasa", headers=admin_headers)
    assert tasa_get.status_code == 200
    assert float(tasa_get.json()["tasa_actual"]["tasa"]) == 50.00

    # 3. Crear cliente y pedido de $100 USD
    cli_res = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Cliente Tasa Test", "documento": "V-12345678", "credito_maximo": "1000.00"},
        headers=admin_headers,
    )
    cliente_id = cli_res.json()["id"]

    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "POLO-VZLA",
            "nombre": "Franela Polo",
            "precio_base": "10.00",
            "variantes_iniciales": [{"color": "Blanco", "talla": "M", "stock": 20}],
        },
        headers=admin_headers,
    )
    var_id = prod_res.json()["variantes"][0]["id"]

    ped_res = await client.post(
        "/api/v1/pedidos",
        json={
            "cliente_id": cliente_id,
            "anticipo": "0.00",
            "lineas": [{"variante_id": var_id, "cantidad": 10, "precio_unitario": "10.00"}], # $100 USD total
        },
        headers=admin_headers,
    )
    pedido_id = ped_res.json()["id"]
    assert float(ped_res.json()["saldo_pendiente"]) == 100.00

    # 4. Pagar 2500 Bs. por Pago Móvil (a tasa 50 Bs/$, equivale a $50 USD)
    pago_res = await client.post(
        "/api/v1/tesoreria/pagos",
        json={
            "pedido_id": pedido_id,
            "monto": "2500.00",
            "moneda_pago": "BS",
            "metodo": "pago_movil",
            "banco": "Banesco",
            "telefono": "04140001122",
            "referencia": "PM-554433",
        },
        headers=admin_headers,
    )
    assert pago_res.status_code == 201
    pago_data = pago_res.json()
    assert float(pago_data["monto_bs"]) == 2500.00
    assert float(pago_data["monto_usd"]) == 50.00
    assert float(pago_data["tasa_cambio"]) == 50.00

    # El saldo del pedido debe haber disminuido en $50 USD -> restante $50 USD
    ped_check = await client.get(f"/api/v1/pedidos/{pedido_id}", headers=admin_headers)
    assert float(ped_check.json()["saldo_pendiente"]) == 50.00
