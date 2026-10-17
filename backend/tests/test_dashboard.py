import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_kpis_admin(client: AsyncClient, create_test_users):
    """Verifica que el endpoint de KPIs del dashboard retorne la estructura esperada para un administrador."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/dashboard/", headers=headers)
    assert res.status_code == 200

    data = res.json()
    assert "kpis" in data
    assert "alertas" in data

    kpis = data["kpis"]
    # Verificar que todos los campos de KPI estén presentes
    required_fields = [
        "pedidos_hoy", "pedidos_en_produccion", "pedidos_pendientes_cobro",
        "pedidos_entregados_mes", "recaudo_hoy", "recaudo_mes", "cartera_total",
        "ordenes_corte_activas", "ordenes_impresion_activas", "ordenes_confeccion_activas",
        "alertas_anticipo_insuficiente", "alertas_credito_excedido",
    ]
    for field in required_fields:
        assert field in kpis, f"Campo KPI faltante: {field}"

    # Los valores deben ser numéricos
    assert kpis["pedidos_hoy"] >= 0
    assert kpis["pedidos_en_produccion"] >= 0
    assert float(kpis["recaudo_hoy"]) >= 0.0
    assert float(kpis["cartera_total"]) >= 0.0

    # alertas debe ser una lista
    assert isinstance(data["alertas"], list)


@pytest.mark.asyncio
async def test_dashboard_bloqueado_para_trabajador(client: AsyncClient, create_test_users):
    """Verifica que el dashboard de KPIs esté bloqueado para usuarios con rol trabajador."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "trabajador@test.com", "password": "trabajadorpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/dashboard/", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_portal_trabajador_con_datos_reales(client: AsyncClient, create_test_users):
    """
    Verifica que el portal del trabajador retorne estadísticas de producción
    y las nóminas recientes cuando el usuario es un trabajador.
    """
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "trabajador@test.com", "password": "trabajadorpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/dashboard/portal-trabajador", headers=headers)
    assert res.status_code == 200

    data = res.json()
    required_fields = [
        "nombre", "tipo_pago", "salario_fijo",
        "hoy_piezas", "hoy_ganancia",
        "semana_piezas", "semana_ganancia",
        "mes_piezas", "mes_ganancia",
        "nominas_recientes",
    ]
    for field in required_fields:
        assert field in data, f"Campo faltante en portal trabajador: {field}"

    # Valores de piezas y ganancia deben ser >= 0
    assert data["hoy_piezas"] >= 0
    assert float(data["hoy_ganancia"]) >= 0.0
    assert data["mes_piezas"] >= 0
    assert isinstance(data["nominas_recientes"], list)


@pytest.mark.asyncio
async def test_portal_trabajador_bloqueado_para_vendedor(client: AsyncClient, create_test_users):
    """Verifica que el portal del trabajador esté bloqueado para vendedores."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/dashboard/portal-trabajador", headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_alertas_con_borrador(client: AsyncClient, create_test_users):
    """
    Verifica que la alerta de anticipo_insuficiente aparezca
    cuando existe al menos un pedido en estado borrador.
    """
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Crear cliente y producto
    cli_res = await client.post(
        "/api/v1/clientes",
        json={
            "nombre": "Bordados Express",
            "documento": "777111222-5",
            "credito_maximo": "3000000.00",
            "activo": True,
        },
        headers=admin_headers,
    )
    cliente_id = cli_res.json()["id"]

    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "BOLS-ECO",
            "nombre": "Bolso Ecológico",
            "tipo": "bolso",
            "precio_base": "60000.00",
            "variantes_iniciales": [
                {"color": "Café", "talla": "Único", "stock": 30},
            ],
        },
        headers=admin_headers,
    )
    var_id = prod_res.json()["variantes"][0]["id"]

    # 2. Crear pedido con anticipo insuficiente (< 30%)
    # Total = 10 * 60.000 = 600.000 → anticipo 10% = 60.000 < 30% = 180.000
    ped_res = await client.post(
        "/api/v1/pedidos",
        json={
            "cliente_id": cliente_id,
            "descuento": "0.00",
            "anticipo": "60000.00",  # Solo 10%
            "lineas": [
                {"variante_id": var_id, "cantidad": 10, "precio_unitario": "60000.00"}
            ],
        },
        headers=admin_headers,
    )
    assert ped_res.status_code == 201
    assert ped_res.json()["estado"] == "borrador"

    # 3. Consultar dashboard y verificar alerta de anticipo
    dash_res = await client.get("/api/v1/dashboard/", headers=admin_headers)
    assert dash_res.status_code == 200
    kpis = dash_res.json()["kpis"]
    alertas = dash_res.json()["alertas"]

    assert kpis["alertas_anticipo_insuficiente"] >= 1
    tipos_alerta = [a["tipo"] for a in alertas]
    assert "anticipo" in tipos_alerta
