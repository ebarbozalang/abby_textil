from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UsuarioBase,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioOut,
)
from app.schemas.cliente import (
    ClienteBase,
    ClienteCreate,
    ClienteUpdate,
    ClienteOut,
)
from app.schemas.producto import (
    VarianteBase,
    VarianteCreate,
    VarianteUpdate,
    VarianteOut,
    ProductoBase,
    ProductoCreate,
    ProductoUpdate,
    ProductoOut,
)
from app.schemas.pedido import (
    LineaPedidoCreate,
    LineaPedidoOut,
    HistorialPedidoOut,
    PedidoCreate,
    CambioEstadoPedido,
    PedidoOut,
)

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UsuarioBase",
    "UsuarioCreate",
    "UsuarioUpdate",
    "UsuarioOut",
    "ClienteBase",
    "ClienteCreate",
    "ClienteUpdate",
    "ClienteOut",
    "VarianteBase",
    "VarianteCreate",
    "VarianteUpdate",
    "VarianteOut",
    "ProductoBase",
    "ProductoCreate",
    "ProductoUpdate",
    "ProductoOut",
    "LineaPedidoCreate",
    "LineaPedidoOut",
    "HistorialPedidoOut",
    "PedidoCreate",
    "CambioEstadoPedido",
    "PedidoOut",
]
