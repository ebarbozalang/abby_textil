import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.usuario import Usuario, RolUsuario
from app.main import app

# Base de datos en memoria para testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Crea una base de datos limpia para cada test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """Cliente HTTP async de pruebas con inyección de sesión de BD."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def create_test_users(db_session: AsyncSession):
    """Crea usuarios con diferentes roles para pruebas de permisos."""
    admin = Usuario(
        nombre="Admin Test",
        email="admin@test.com",
        password_hash=hash_password("adminpass"),
        rol=RolUsuario.ADMINISTRADOR,
        activo=True,
    )
    vendedor = Usuario(
        nombre="Vendedor Test",
        email="vendedor@test.com",
        password_hash=hash_password("vendedorpass"),
        rol=RolUsuario.VENDEDOR,
        activo=True,
    )
    trabajador = Usuario(
        nombre="Trabajador Test",
        email="trabajador@test.com",
        password_hash=hash_password("trabajadorpass"),
        rol=RolUsuario.TRABAJADOR,
        activo=True,
    )
    inactivo = Usuario(
        nombre="Inactivo Test",
        email="inactivo@test.com",
        password_hash=hash_password("inactivopass"),
        rol=RolUsuario.VENDEDOR,
        activo=False,
    )

    db_session.add_all([admin, vendedor, trabajador, inactivo])
    await db_session.commit()
    return {
        "admin": admin,
        "vendedor": vendedor,
        "trabajador": trabajador,
        "inactivo": inactivo,
    }
