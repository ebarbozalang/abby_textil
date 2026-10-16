import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Verifica que el servicio esté respondiendo correctamente."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, create_test_users):
    """Verifica inicio de sesión exitoso y retorno de JWT."""
    payload = {
        "email": "admin@test.com",
        "password": "adminpass"
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@test.com"
    assert data["user"]["rol"] == "administrador"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, create_test_users):
    """Verifica rechazo con contraseña incorrecta."""
    payload = {
        "email": "admin@test.com",
        "password": "wrong_password"
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Credenciales incorrectas" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, create_test_users):
    """Verifica que un usuario inactivo no pueda iniciar sesión."""
    payload = {
        "email": "inactivo@test.com",
        "password": "inactivopass"
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 403
    assert "Usuario desactivado" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient, create_test_users):
    """Verifica endpoint /auth/me usando token Bearer."""
    # 1. Login
    login_res = await client.post("/api/v1/auth/login", json={"email": "vendedor@test.com", "password": "vendedorpass"})
    token = login_res.json()["access_token"]

    # 2. Consulta /me
    headers = {"Authorization": f"Bearer {token}"}
    me_res = await client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "vendedor@test.com"
    assert me_res.json()["rol"] == "vendedor"


@pytest.mark.asyncio
async def test_role_enforcement_admin_allowed(client: AsyncClient, create_test_users):
    """Verifica que el rol administrador tenga acceso al endpoint protegido de admin."""
    login_res = await client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "adminpass"})
    token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    res = await client.get("/api/v1/auth/check-admin", headers=headers)
    assert res.status_code == 200
    assert res.json()["rol"] == "administrador"


@pytest.mark.asyncio
async def test_role_enforcement_vendedor_forbidden(client: AsyncClient, create_test_users):
    """Verifica que un vendedor sea rechazado (403) al intentar acceder a zona de admin."""
    login_res = await client.post("/api/v1/auth/login", json={"email": "vendedor@test.com", "password": "vendedorpass"})
    token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    res = await client.get("/api/v1/auth/check-admin", headers=headers)
    assert res.status_code == 403
    assert "Permiso denegado" in res.json()["detail"]


@pytest.mark.asyncio
async def test_role_enforcement_trabajador_portal_access(client: AsyncClient, create_test_users):
    """Verifica acceso del rol trabajador a su endpoint respectivo."""
    login_res = await client.post("/api/v1/auth/login", json={"email": "trabajador@test.com", "password": "trabajadorpass"})
    token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    res = await client.get("/api/v1/auth/check-trabajador", headers=headers)
    assert res.status_code == 200
    assert res.json()["rol"] == "trabajador"
