import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_flujo_produccion_secuencial_completo(client: AsyncClient, create_test_users, db_session):
    """
    Verifica el flujo secuencial estricto:
    1. Pedido ➔ 2. Corte ➔ 3. Confección ➔ 4. Control de Calidad.
    Valida que no se pueda iniciar Confección sin haber terminado el Corte.
    """
    # 1. Login como admin
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Crear trabajador para producción
    from app.models.trabajador import Trabajador, TipoPago
    trabajador = Trabajador(
        nombre="Pedro Cortador y Confeccionista",
        documento="1098765400",
        telefono="+57 315 111 2233",
        tipo_pago=TipoPago.PRODUCCION,
        salario_fijo=0,
        activo=True,
    )
    db_session.add(trabajador)
    await db_session.commit()
    trabajador_id = trabajador.id

    # 3. Crear cliente
    cli_res = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Modas Bogotá", "documento": "900555666-1", "credito_maximo": "5000000.00"},
        headers=headers,
    )
    cliente_id = cli_res.json()["id"]

    # 4. Crear producto
    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "CONJ-DAM-SPORT",
            "nombre": "Conjunto Dama Deportivo",
            "tipo": "conjunto_dama",
            "precio_base": "80000.00",
            "variantes_iniciales": [{"color": "Negro", "talla": "M", "stock": 50}],
        },
        headers=headers,
    )
    variante_id = prod_res.json()["variantes"][0]["id"]

    # 5. Crear pedido con 40% de anticipo (10 conjuntos a $80.000 = $800.000, anticipo = $320.000)
    ped_res = await client.post(
        "/api/v1/pedidos",
        json={
            "cliente_id": cliente_id,
            "anticipo": "320000.00",
            "lineas": [{"variante_id": variante_id, "cantidad": 10, "precio_unitario": "80000.00"}],
        },
        headers=headers,
    )
    assert ped_res.status_code == 201
    pedido = ped_res.json()
    linea_id = pedido["lineas"][0]["id"]
    codigo_rastreo = pedido["lineas"][0]["codigo_rastreo_unico"]

    # 6. Intentar crear orden de Confección DIRECTAMENTE sin haber completado corte -> DEBE FALLAR (400)
    conf_invalida_res = await client.post(
        "/api/v1/produccion/confeccion",
        json={
            "linea_pedido_id": linea_id,
            "operador_id": trabajador_id,
            "cantidad_prendas": 10,
            "costo_unitario": "5000.00",
        },
        headers=headers,
    )
    assert conf_invalida_res.status_code == 400
    assert "Bloqueo Secuencial: La prenda" in conf_invalida_res.json()["detail"]
    assert "no ha completado la etapa de Corte" in conf_invalida_res.json()["detail"]

    # 7. Iniciar orden de Corte válida
    corte_res = await client.post(
        "/api/v1/produccion/corte",
        json={
            "linea_pedido_id": linea_id,
            "cortador_id": trabajador_id,
            "cantidad_piezas": 10,
            "costo_unitario": "1500.00",
        },
        headers=headers,
    )
    assert corte_res.status_code == 201
    corte_data = corte_res.json()
    assert corte_data["estado"] == "en_proceso"
    corte_id = corte_data["id"]

    # 8. Marcar Corte como TERMINADO
    corte_term_res = await client.put(f"/api/v1/produccion/corte/{corte_id}/terminar", headers=headers)
    assert corte_term_res.status_code == 200
    assert corte_term_res.json()["estado"] == "terminado"

    # 9. Ahora sí, iniciar orden de Confección -> DEBE TENER ÉXITO (201)
    conf_res = await client.post(
        "/api/v1/produccion/confeccion",
        json={
            "linea_pedido_id": linea_id,
            "operador_id": trabajador_id,
            "cantidad_prendas": 10,
            "costo_unitario": "5000.00",
        },
        headers=headers,
    )
    assert conf_res.status_code == 201
    conf_data = conf_res.json()
    assert conf_data["estado"] == "en_proceso"
    conf_id = conf_data["id"]

    # 10. Terminar orden de Confección -> Debe avanzar el pedido a control_calidad
    conf_term_res = await client.put(f"/api/v1/produccion/confeccion/{conf_id}/terminar", headers=headers)
    assert conf_term_res.status_code == 200
    assert conf_term_res.json()["estado"] == "terminado"

    # Verificar que el pedido ahora esté en control_calidad
    ped_actualizado = (await client.get(f"/api/v1/pedidos/{pedido['id']}", headers=headers)).json()
    assert ped_actualizado["estado"] == "control_calidad"


@pytest.mark.asyncio
async def test_escaneo_qr_produccion_rapido(client: AsyncClient, create_test_users, db_session):
    """Verifica que el escaneo de QR avance la etapa y compute el monto producido para el trabajador."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Trabajador
    from app.models.trabajador import Trabajador, TipoPago
    trabajador = Trabajador(
        nombre="Luisa Técnica QR",
        documento="555666777",
        tipo_pago=TipoPago.PRODUCCION,
        salario_fijo=0,
        activo=True,
    )
    db_session.add(trabajador)
    await db_session.commit()

    # Cliente y Producto
    cli_res = await client.post(
        "/api/v1/clientes",
        json={"nombre": "Cliente QR", "documento": "999111222", "credito_maximo": "5000000.00"},
        headers=headers,
    )
    prod_res = await client.post(
        "/api/v1/productos",
        json={
            "codigo": "CAM-BORD",
            "nombre": "Camisa para Bordado",
            "precio_base": "60000.00",
            "variantes_iniciales": [{"color": "Blanco", "talla": "L", "stock": 20}],
        },
        headers=headers,
    )
    var_id = prod_res.json()["variantes"][0]["id"]

    # Pedido con anticipo 50%
    ped_res = await client.post(
        "/api/v1/pedidos",
        json={
            "cliente_id": cli_res.json()["id"],
            "anticipo": "300000.00",
            "lineas": [{"variante_id": var_id, "cantidad": 10, "precio_unitario": "60000.00"}],
        },
        headers=headers,
    )
    codigo_rastreo = ped_res.json()["lineas"][0]["codigo_rastreo_unico"]

    # 1. Escanear en Mesa de Corte -> Avanza corte y calcula 10 * 1500 = 15.000 COP
    scan_corte = await client.post(
        "/api/v1/produccion/escanear-qr",
        json={
            "codigo_rastreo_unico": codigo_rastreo,
            "trabajador_id": trabajador.id,
            "costo_unitario": "1500.00",
        },
        headers=headers,
    )
    assert scan_corte.status_code == 200
    res_corte = scan_corte.json()
    assert res_corte["etapa_completada"] == "Corte"
    assert float(res_corte["monto_generado"]) == 15000.0

    # 2. Escanear en Taller de Confección -> Avanza confección y calcula 10 * 5000 = 50.000 COP
    scan_conf = await client.post(
        "/api/v1/produccion/escanear-qr",
        json={
            "codigo_rastreo_unico": codigo_rastreo,
            "trabajador_id": trabajador.id,
            "costo_unitario": "5000.00",
        },
        headers=headers,
    )
    assert scan_conf.status_code == 200
    res_conf = scan_conf.json()
    assert res_conf["etapa_completada"] == "Confección"
    assert float(res_conf["monto_generado"]) == 50000.0
