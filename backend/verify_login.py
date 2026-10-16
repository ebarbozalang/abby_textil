import asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app

async def main():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Probar health
        health = await client.get("/health")
        print("HEALTH:", health.status_code, health.json())

        # 2. Probar login con superusuario
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@textilapp.com", "password": "admin123"}
        )
        print("LOGIN STATUS:", login_res.status_code)
        data = login_res.json()
        token = data.get("access_token")
        print("USER:", data.get("user"))

        # 3. Probar /auth/me
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        print("ME STATUS:", me_res.status_code, me_res.json())

        # 4. Probar /auth/seed-demo-users
        seed_res = await client.post("/api/v1/auth/seed-demo-users")
        print("SEED STATUS:", seed_res.status_code, seed_res.json())

if __name__ == "__main__":
    asyncio.run(main())
