import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cliente_crud(client: AsyncClient, create_test_users):
    """Verifica ciclo de vida completo de un cliente y control de crédito."""
    # 1. Login como vendedor
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Crear cliente
    cliente_payload = {
        "nombre": "Boutique Elegancia C.A.",
        "documento": "J-40123456-7",
        "telefono": "+58 414 123 4567",
        "direccion": "Av. Francisco de Miranda, Chacao, Caracas",
        "email": "contacto@elegancia.com",
        "credito_maximo": "5000.00",
        "activo": True,
    }
    create_res = await client.post("/api/v1/clientes", json=cliente_payload, headers=headers)
    assert create_res.status_code == 201
    cliente = create_res.json()
    assert cliente["nombre"] == "Boutique Elegancia C.A."
    assert cliente["documento"] == "J-40123456-7"
    assert float(cliente["credito_maximo"]) == 5000.0
    assert float(cliente["saldo_pendiente_global"]) == 0.0
    assert cliente["credito_disponible"] == 5000.0
    assert cliente["excede_credito"] is False
    cliente_id = cliente["id"]

    # 3. Validar rechazo de documento duplicado
    dup_res = await client.post("/api/v1/clientes", json=cliente_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "Ya existe un cliente" in dup_res.json()["detail"]

    # 4. Listar clientes con filtro de búsqueda
    list_res = await client.get("/api/v1/clientes?q=Elegancia", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 5. Obtener cliente por ID
    get_res = await client.get(f"/api/v1/clientes/{cliente_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == cliente_id

    # 6. Actualizar crédito y teléfono
    update_payload = {"credito_maximo": "7000.00", "telefono": "+58 424 999 8888"}
    put_res = await client.put(f"/api/v1/clientes/{cliente_id}", json=update_payload, headers=headers)
    assert put_res.status_code == 200
    assert float(put_res.json()["credito_maximo"]) == 7000.0
    assert put_res.json()["telefono"] == "+58 424 999 8888"

    # 7. Desactivar cliente (requiere admin o superuser)
    # Login como admin
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    del_res = await client.delete(f"/api/v1/clientes/{cliente_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "ok"

    # Verificar que ya no aparece en solo_activos
    list_activos = await client.get("/api/v1/clientes?solo_activos=true", headers=admin_headers)
    ids_activos = [c["id"] for c in list_activos.json()]
    assert cliente_id not in ids_activos
