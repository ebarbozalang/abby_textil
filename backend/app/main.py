from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import hash_password
from app.models.usuario import Usuario, RolUsuario
from app.models.trabajador import Trabajador
from app.models.cliente import Cliente
from app.models.producto import Producto, Variante
from app.models.pedido import Pedido, LineaPedido, HistorialPedido
from app.models.produccion import OrdenCorte, OrdenImpresion, OrdenConfeccion
from app.api.v1.router import api_router


async def init_db():
    """Crea tablas e inicializa el superusuario por defecto si no existe."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        query = select(Usuario).where(Usuario.email == settings.FIRST_SUPERUSER_EMAIL.lower().strip())
        result = await session.execute(query)
        admin = result.scalar_one_or_none()
        if not admin:
            nuevo_admin = Usuario(
                nombre=settings.FIRST_SUPERUSER_NOMBRE,
                email=settings.FIRST_SUPERUSER_EMAIL.lower().strip(),
                password_hash=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
                rol=RolUsuario.SUPERUSUARIO,
                activo=True
            )
            session.add(nuevo_admin)
            await session.commit()
            print(f"[OK] Superusuario inicial creado: {settings.FIRST_SUPERUSER_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API de Producción y Gestión Textil bajo pedido con Trazabilidad Total",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de Rutas API
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "sistema": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "estado": "operativo",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }
