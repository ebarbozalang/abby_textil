import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_obtener_configuracion(client: AsyncClient, create_test_users):
    """Verifica que se obtenga la configuración por defecto de la empresa."""
    res = await client.get("/api/v1/configuracion")
    assert res.status_code == 200
    data = res.json()

    assert data["nombre_empresa"] == "Inversiones AbbySoft Textil C.A."
    assert data["rif"] == "J-40812345-6"
    assert data["theme_mode"] == "dark"
    assert data["color_primario"] == "#7B0078"
    assert "logo_url" in data
    assert "telefonos" in data
    assert "correo" in data


@pytest.mark.asyncio
async def test_actualizar_configuracion_admin(client: AsyncClient, create_test_users):
    """Verifica que un administrador pueda actualizar datos de la empresa y tema."""
    admin_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    update_payload = {
        "nombre_empresa": "Confecciones Abby Textil S.A.",
        "telefonos": "+58 424 9998877",
        "theme_mode": "light",
        "color_primario": "#2563EB",
    }
    put_res = await client.put(
        "/api/v1/configuracion",
        json=update_payload,
        headers=admin_headers,
    )
    assert put_res.status_code == 200
    data = put_res.json()
    assert data["nombre_empresa"] == "Confecciones Abby Textil S.A."
    assert data["telefonos"] == "+58 424 9998877"
    assert data["theme_mode"] == "light"
    assert data["color_primario"] == "#2563EB"

    # Restablecer a valores por defecto
    reset_res = await client.post("/api/v1/configuracion/restablecer", headers=admin_headers)
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["nombre_empresa"] == "Inversiones AbbySoft Textil C.A."
    assert reset_data["theme_mode"] == "dark"
    assert reset_data["color_primario"] == "#7B0078"


@pytest.mark.asyncio
async def test_actualizar_configuracion_vendedor_bloqueado(client: AsyncClient, create_test_users):
    """Verifica que un vendedor no tenga permiso para modificar la configuración de empresa."""
    vendedor_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "vendedor@test.com", "password": "vendedorpass"},
    )
    token = vendedor_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.put(
        "/api/v1/configuracion",
        json={"nombre_empresa": "Intento no autorizado"},
        headers=headers,
    )
    assert res.status_code == 403
