from typing import List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.usuario import Usuario, RolUsuario

security_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    """Extrae y valida el token JWT del encabezado Bearer, retornando el usuario."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no contiene identificador de usuario válido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        query = select(Usuario).where(Usuario.id == int(user_id))
        result = await db.execute(query)
        user = result.scalar_one_or_none()
    except Exception:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo en el sistema",
        )

    return user


def require_role(*allowed_roles: RolUsuario) -> Callable:
    """
    Decorador / Dependencia de FastAPI para verificar permisos de rol.
    Los superusuarios siempre tienen permiso concedido a todos los endpoints.
    """
    async def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        # Superusuario tiene acceso total
        if current_user.rol == RolUsuario.SUPERUSUARIO:
            return current_user

        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado. Se requiere uno de los roles: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker
