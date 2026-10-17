import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_trabajador_crud(client: AsyncClient, create_test_users):
    """Verifica registro y actualización de trabajadores."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # 1. Crear trabajador modalidad produccion
    t_payload = {
        "nombre": "Jorge Cortador Experto",
        "documento": "10102020",
        "telefono": "+57 312 000 9999",
        "tipo_pago": "produccion",
        "salario_fijo": "0.00",
        "activo": True,
    }
    create_res = await client.post("/api/v1/trabajadores", json=t_payload, headers=headers)
    assert create_res.status_code == 201
    t_data = create_res.json()
    assert t_data["nombre"] == "Jorge Cortador Experto"
    assert t_data["tipo_pago"] == "produccion"
    t_id = t_data["id"]

    # 2. Rechazo de documento duplicado
    dup_res = await client.post("/api/v1/trabajadores", json=t_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "Ya existe un trabajador con el documento" in dup_res.json()["detail"]

    # 3. Actualizar a modalidad mixto con salario base
    put_res = await client.put(
        f"/api/v1/trabajadores/{t_id}",
        json={"tipo_pago": "mixto", "salario_fijo": "1200000.00"},
        headers=headers,
    )
    assert put_res.status_code == 200
    assert put_res.json()["tipo_pago"] == "mixto"
    assert float(put_res.json()["salario_fijo"]) == 1200000.0

    # 4. Listar trabajadores
    list_res = await client.get("/api/v1/trabajadores?q=Jorge", headers=headers)
    assert list_res.status_code == 200
    assert any(t["id"] == t_id for t in list_res.json())


@pytest.mark.asyncio
async def test_liquidacion_nomina_produccion_y_mixto(client: AsyncClient, create_test_users, db_session):
    """Verifica cálculo automático de nómina para trabajadores por producción y mixto."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # 1. Crear trabajador por producción
    t_prod = (
        await client.post(
            "/api/v1/trabajadores",
            json={
                "nombre": "Marta Confección",
                "documento": "888999111",
                "tipo_pago": "produccion",
                "salario_fijo": "0.00",
            },
            headers=headers,
        )
    ).json()

    # 2. Crear trabajador mixto (base fija + producción)
    t_mixto = (
        await client.post(
            "/api/v1/trabajadores",
            json={
                "nombre": "Ricardo Cortador Mixto",
                "documento": "888999222",
                "tipo_pago": "mixto",
                "salario_fijo": "800000.00",
            },
            headers=headers,
        )
    ).json()

    # 3. Crear cliente, producto y pedido para generar órdenes
    cli = (
        await client.post(
            "/api/v1/clientes",
            json={"nombre": "Cliente Nómina", "documento": "11223344", "credito_maximo": "5000000.00"},
            headers=headers,
        )
    ).json()

    prod = (
        await client.post(
            "/api/v1/productos",
            json={
                "codigo": "POL-NOM",
                "nombre": "Polo Nómina Test",
                "precio_base": "50000.00",
                "variantes_iniciales": [{"color": "Azul", "talla": "M", "stock": 50}],
            },
            headers=headers,
        )
    ).json()

    ped = (
        await client.post(
            "/api/v1/pedidos",
            json={
                "cliente_id": cli["id"],
                "anticipo": "400000.00",
                "lineas": [{"variante_id": prod["variantes"][0]["id"], "cantidad": 20, "precio_unitario": "50000.00"}],
            },
            headers=headers,
        )
    ).json()
    linea_id = ped["lineas"][0]["id"]

    # 4. Generar orden de corte terminada para Ricardo (Mixto): 20 piezas a $1.500 = $30.000
    oc = (
        await client.post(
            "/api/v1/produccion/corte",
            json={
                "linea_pedido_id": linea_id,
                "cortador_id": t_mixto["id"],
                "cantidad_piezas": 20,
                "costo_unitario": "1500.00",
            },
            headers=headers,
        )
    ).json()
    await client.put(f"/api/v1/produccion/corte/{oc['id']}/terminar", headers=headers)

    # 5. Generar orden de confección terminada para Marta (Producción): 20 prendas a $4.000 = $80.000
    oconf = (
        await client.post(
            "/api/v1/produccion/confeccion",
            json={
                "linea_pedido_id": linea_id,
                "operador_id": t_prod["id"],
                "cantidad_prendas": 20,
                "costo_unitario": "4000.00",
            },
            headers=headers,
        )
    ).json()
    await client.put(f"/api/v1/produccion/confeccion/{oconf['id']}/terminar", headers=headers)

    # 6. Liquidar Nómina del periodo (Hoy)
    today_str = date.today().isoformat()
    liq_res = await client.post(
        "/api/v1/trabajadores/liquidar-nomina",
        json={"periodo_inicio": today_str, "periodo_fin": today_str},
        headers=headers,
    )
    assert liq_res.status_code == 200
    nominas = liq_res.json()

    # Validar nómina de Marta (Producción): fijo = 0, produccion = 80000, total = 80000
    nom_marta = next(n for n in nominas if n["trabajador_id"] == t_prod["id"])
    assert nom_marta["total_producido"] == 20
    assert float(nom_marta["monto_produccion"]) == 80000.0
    assert float(nom_marta["monto_fijo"]) == 0.0
    assert float(nom_marta["total"]) == 80000.0
    assert nom_marta["estado"] == "pendiente"

    # Validar nómina de Ricardo (Mixto): fijo = 800000, produccion = 30000, total = 830000
    nom_ricardo = next(n for n in nominas if n["trabajador_id"] == t_mixto["id"])
    assert nom_ricardo["total_producido"] == 20
    assert float(nom_ricardo["monto_produccion"]) == 30000.0
    assert float(nom_ricardo["monto_fijo"]) == 800000.0
    assert float(nom_ricardo["total"]) == 830000.0

    # 7. Marcar nómina de Marta como pagada
    pagar_res = await client.put(f"/api/v1/trabajadores/nominas/{nom_marta['id']}/pagar", headers=headers)
    assert pagar_res.status_code == 200
    assert pagar_res.json()["estado"] == "pagado"
    assert pagar_res.json()["fecha_pago"] is not None
