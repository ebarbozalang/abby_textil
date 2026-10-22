import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_crear_pedido_con_anticipo_valido(client: AsyncClient, create_test_users):
    """Verifica creación de pedido con anticipo válido (>=30%) y generación de códigos de rastreo único."""
    # 1. Login como vendedor
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Crear cliente
    cli_res = await client.post(
        "/api/v1/clientes",
        json={
            "nombre": "Textiles del Norte C.A.",
            "documento": "J-30111222-3",
            "telefono": "+58 412 333 4444",
            "credito_maximo": "10000000.00",
            "activo": True,
        },
        headers=headers,
    )
    cliente_id = cli_res.json()["id"]

    # 3. Crear producto con variantes
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "POLO-DEP",
            "nombre": "Camiseta Polo Deportiva",
            "tipo": "deportiva",
            "precio_base": "45000.00",
            "variantes_iniciales": [
                {"color": "Azul", "talla": "M", "stock": 100},
                {"color": "Blanco", "talla": "L", "stock": 50},
            ],
        },
        headers=admin_headers,
    )
    prod = prod_res.json()
    var_1_id = prod["variantes"][0]["id"]
    var_2_id = prod["variantes"][1]["id"]

    # 4. Crear pedido con 40% de anticipo
    # Línea 1: 10 camisetas a 45.000 = 450.000
    # Línea 2: 10 camisetas a 45.000 = 450.000
    # Subtotal = 900.000, Descuento = 0, Total = 900.000
    # Anticipo = 360.000 (40% >= 30%)
    pedido_payload = {
        "cliente_id": cliente_id,
        "descuento": "0.00",
        "anticipo": "360000.00",
        "fecha_entrega_estimada": "2026-11-15",
        "notas": "Pedido para dotación deportiva empresarial",
        "lineas": [
            {"variante_id": var_1_id, "cantidad": 10, "precio_unitario": "45000.00"},
            {"variante_id": var_2_id, "cantidad": 10, "precio_unitario": "45000.00"},
        ],
    }

    ped_res = await client.post("/api/v1/pedidos", json=pedido_payload, headers=headers)
    assert ped_res.status_code == 201
    ped = ped_res.json()
    assert ped["estado"] == "confirmado"
    assert float(ped["total"]) == 900000.0
    assert float(ped["anticipo"]) == 360000.0
    assert float(ped["saldo_pendiente"]) == 540000.0
    assert ped["porcentaje_anticipo"] == 40.0
    assert ped["cumple_anticipo_minimo"] is True
    assert len(ped["lineas"]) == 2

    # Verificar códigos de rastreo únicos de cada línea
    cod_rastreo_1 = ped["lineas"][0]["codigo_rastreo_unico"]
    cod_rastreo_2 = ped["lineas"][1]["codigo_rastreo_unico"]
    assert f"RAS-PED{ped['id']}-" in cod_rastreo_1
    assert cod_rastreo_1 != cod_rastreo_2

    # Verificar consulta directa por código de rastreo
    rastreo_res = await client.get(f"/api/v1/pedidos/rastreo/{cod_rastreo_1}", headers=headers)
    assert rastreo_res.status_code == 200
    assert rastreo_res.json()["codigo_rastreo_unico"] == cod_rastreo_1


@pytest.mark.asyncio
async def test_anticipo_insuficiente_bloquea_produccion(client: AsyncClient, create_test_users):
    """Verifica que un pedido con menos del 30% quede en borrador y no pase a producción sin completar anticipo."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Cliente
    cli_res = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Cliente Anticipo Bajo", "documento": "777888999", "credito_maximo": "5000000.00"},
        headers=headers,
    )
    cliente_id = cli_res.json()["id"]

    # 2. Producto
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "PANT-CAS",
            "nombre": "Pantalón Casual",
            "precio_base": "80000.00",
            "variantes_iniciales": [{"color": "Kaki", "talla": "32", "stock": 50}],
        },
        headers=admin_headers,
    )
    var_id = prod_res.json()["variantes"][0]["id"]

    # 3. Crear pedido con solo 10% de anticipo (10 prendas a 80.000 = 800.000, anticipo = 80.000)
    pedido_payload = {
        "cliente_id": cliente_id,
        "anticipo": "80000.00",
        "lineas": [{"variante_id": var_id, "cantidad": 10, "precio_unitario": "80000.00"}],
    }
    res = await client.post("/api/v1/pedidos", json=pedido_payload, headers=headers)
    assert res.status_code == 201
    ped = res.json()
    assert ped["estado"] == "borrador"
    assert ped["porcentaje_anticipo"] == 10.0
    assert ped["cumple_anticipo_minimo"] is False
    pedido_id = ped["id"]

    # 4. Intentar forzar paso a corte
    cambio_res = await client.put(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"nuevo_estado": "pendiente_corte", "observacion": "Intento de inicio de producción"},
        headers=headers,
    )
    assert cambio_res.status_code == 400
    assert "Anticipo Insuficiente" in cambio_res.json()["detail"]


@pytest.mark.asyncio
async def test_bloqueo_por_exceso_de_cupo_de_credito(client: AsyncClient, create_test_users):
    """Verifica que el sistema rechace el pedido si la deuda acumulada supera el crédito máximo."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Cliente con cupo limitado de $1.000.000
    cli_res = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Cliente Sin Cupo", "documento": "123000999", "credito_maximo": "1000000.00"},
        headers=headers,
    )
    cliente_id = cli_res.json()["id"]

    # Producto
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "CHAQ-TEXT",
            "nombre": "Chaqueta Cortavientos",
            "precio_base": "120000.00",
            "variantes_iniciales": [{"color": "Negro", "talla": "L", "stock": 40}],
        },
        headers=admin_headers,
    )
    var_id = prod_res.json()["variantes"][0]["id"]

    # Pedido: 20 chaquetas a $100.000 = $2.000.000
    # Anticipo: $500.000. Saldo a crédito = $1.500.000 (> cupo $1.000.000)
    ped_payload = {
        "cliente_id": cliente_id,
        "anticipo": "500000.00",
        "lineas": [{"variante_id": var_id, "cantidad": 20, "precio_unitario": "100000.00"}],
    }
    rechazo_res = await client.post("/api/v1/pedidos", json=ped_payload, headers=headers)
    assert rechazo_res.status_code == 400
    assert "Bloqueo por Cupo de Crédito" in rechazo_res.json()["detail"]
