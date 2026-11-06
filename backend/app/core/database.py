from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings

def get_database_url() -> str:
    """Normaliza URLs de base de datos para SQLAlchemy Async + asyncpg (Neon, Supabase, Render)."""
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "sslmode=require" in url:
        url = url.replace("sslmode=require", "ssl=require")
    return url


# Conexión Async para SQLAlchemy 2.0
db_url = get_database_url()
engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    # Para SQLite necesitamos connect_args check_same_thread=False
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Inyector de dependencia para obtener sesión async de base de datos."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
