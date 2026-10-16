import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_catalogo_y_variantes_sku(client: AsyncClient, create_test_users):
    """Verifica creación de productos, auto-generación de SKU único y gestión de stock."""
    # 1. Login como admin
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Crear producto con variantes iniciales
    prod_payload = {
        "codigo": "CAM-OXFORD",
        "nombre": "Camisa Oxford Manga Larga",
        "tipo": "camisa",
        "descripcion": "Camisa formal 100% algodón",
        "precio_base": "85000.00",
        "activo": True,
        "variantes_iniciales": [
            {"color": "Azul", "talla": "M", "stock": 50},
            {"color": "Blanco", "talla": "L", "stock": 30},
        ],
    }
    create_res = await client.post("/api/v1/productos", json=prod_payload, headers=headers)
    assert create_res.status_code == 201
    prod = create_res.json()
    assert prod["codigo"] == "CAM-OXFORD"
    assert prod["nombre"] == "Camisa Oxford Manga Larga"
    assert len(prod["variantes"]) == 2

    # Verificar que el SKU único se autogeneró correctamente: CODIGO-COL-TALLA
    # CAM-OXFORD -> CAMOXFORD-AZU-M o similar
    skus = [v["sku_unico"] for v in prod["variantes"]]
    assert any("AZU-M" in s for s in skus)
    assert any("BLA-L" in s for s in skus)
    prod_id = prod["id"]

    # 3. Rechazar código de producto duplicado
    dup_res = await client.post("/api/v1/productos", json=prod_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "Ya existe un producto con el código" in dup_res.json()["detail"]

    # 4. Agregar una nueva variante individual al producto
    nueva_var_payload = {"color": "Rojo", "talla": "S", "stock": 15}
    var_res = await client.post(
        f"/api/v1/productos/{prod_id}/variantes",
        json=nueva_var_payload,
        headers=headers,
    )
    assert var_res.status_code == 201
    nueva_var = var_res.json()
    assert "ROJ-S" in nueva_var["sku_unico"]
    assert nueva_var["stock"] == 15
    var_id = nueva_var["id"]

    # 5. Intentar agregar variante duplicada (mismo color y talla)
    dup_var_res = await client.post(
        f"/api/v1/productos/{prod_id}/variantes",
        json=nueva_var_payload,
        headers=headers,
    )
    assert dup_var_res.status_code == 400
    assert "Ya existe una variante registrada" in dup_var_res.json()["detail"]

    # 6. Actualizar stock de la variante
    update_var_res = await client.put(
        f"/api/v1/productos/{prod_id}/variantes/{var_id}",
        json={"stock": 25},
        headers=headers,
    )
    assert update_var_res.status_code == 200
    assert update_var_res.json()["stock"] == 25

    # 7. Listar productos y verificar presencia de variantes
    list_res = await client.get("/api/v1/productos?tipo=camisa", headers=headers)
    assert list_res.status_code == 200
    productos = list_res.json()
    assert any(p["id"] == prod_id for p in productos)

    # 8. Eliminar variante
    del_var_res = await client.delete(
        f"/api/v1/productos/{prod_id}/variantes/{var_id}",
        headers=headers,
    )
    assert del_var_res.status_code == 200
    assert "eliminada" in del_var_res.json()["message"]
