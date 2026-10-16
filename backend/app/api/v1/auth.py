from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, hash_password
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario, RolUsuario
from app.schemas.auth import LoginRequest, TokenResponse, UsuarioOut, UsuarioCreate

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Inicia sesión y genera un JWT con el rol del usuario."""
    query = select(Usuario).where(Usuario.email == credentials.email.lower().strip())
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (correo o contraseña no válidos)",
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado en el sistema",
        )

    token = create_access_token(
        subject=user.id,
        role=user.rol.value,
        email=user.email,
        nombre=user.nombre,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UsuarioOut.model_validate(user),
    )


@router.get("/me", response_model=UsuarioOut)
async def get_my_profile(current_user: Usuario = Depends(get_current_user)):
    """Obtiene el perfil y rol del usuario actualmente autenticado."""
    return UsuarioOut.model_validate(current_user)


@router.get("/check-admin", response_model=UsuarioOut)
async def check_admin_access(
    current_user: Usuario = Depends(require_role(RolUsuario.ADMINISTRADOR, RolUsuario.SUPERUSUARIO))
):
    """Endpoint de verificación de rol Administrador / Superusuario."""
    return UsuarioOut.model_validate(current_user)


@router.get("/check-trabajador", response_model=UsuarioOut)
async def check_trabajador_access(
    current_user: Usuario = Depends(require_role(RolUsuario.TRABAJADOR))
):
    """Endpoint de verificación de rol Trabajador."""
    return UsuarioOut.model_validate(current_user)


@router.post("/seed-demo-users")
async def seed_demo_users(db: AsyncSession = Depends(get_db)):
    """Inicializa usuarios de prueba para cada rol del sistema si no existen."""
    demo_users = [
        {
            "nombre": "Carlos Vendedor",
            "email": "vendedor@textilapp.com",
            "password": "password123",
            "rol": RolUsuario.VENDEDOR
        },
        {
            "nombre": "Ana Administradora",
            "email": "admin2@textilapp.com",
            "password": "password123",
            "rol": RolUsuario.ADMINISTRADOR
        },
        {
            "nombre": "Juan Operario",
            "email": "trabajador@textilapp.com",
            "password": "password123",
            "rol": RolUsuario.TRABAJADOR
        }
    ]

    creados = []
    for u in demo_users:
        q = select(Usuario).where(Usuario.email == u["email"])
        res = await db.execute(q)
        if not res.scalar_one_or_none():
            nuevo = Usuario(
                nombre=u["nombre"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                rol=u["rol"],
                activo=True
            )
            db.add(nuevo)
            creados.append(u["email"])

    await db.commit()
    return {"status": "ok", "usuarios_creados": creados}
