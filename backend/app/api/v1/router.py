from fastapi import APIRouter
from app.api.v1 import auth, clientes, productos, pedidos, produccion, trabajadores

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clientes.router)
api_router.include_router(productos.router)
api_router.include_router(pedidos.router)
api_router.include_router(produccion.router)
api_router.include_router(trabajadores.router)
