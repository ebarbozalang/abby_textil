import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Tuple, Optional
import httpx
from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tasa_cambio import TasaCambio
from app.core.config import settings


_tasa_cache = {"tasa": None, "fuente": None, "timestamp": 0.0}

async def consultar_tasa_bcv_en_linea(force_refresh: bool = False) -> Tuple[Decimal, str]:
    """
    Consulta la tasa oficial del BCV (Banco Central de Venezuela) en línea.
    Usa varias fuentes con fallback para máxima disponibilidad y resiliencia:
    1. Cache en memoria (10 minutos) si no se fuerza refresco
    2. DolarApi Venezuela (espejo oficial del BCV rápido y seguro)
    3. Scraping directo del portal bcv.org.ve (con bypass de SSL por si los certificados fallan)
    4. PyDolarVenezuela API
    5. Fallback al valor por defecto configurado (45.00)
    """
    import time
    global _tasa_cache
    now = time.time()

    if not force_refresh and _tasa_cache["tasa"] is not None and (now - _tasa_cache["timestamp"]) < 600:
        return _tasa_cache["tasa"], _tasa_cache["fuente"]

    # 1. DolarApi Venezuela
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get("https://ve.dolarapi.com/v1/dolares/oficial")
            if resp.status_code == 200:
                data = resp.json()
                tasa_val = float(data.get("promedio", 0))
                if tasa_val > 0:
                    res_tasa = Decimal(f"{tasa_val:.4f}")
                    _tasa_cache = {"tasa": res_tasa, "fuente": "bcv_dolarapi", "timestamp": now}
                    return res_tasa, "bcv_dolarapi"
    except Exception as e:
        print(f"[Aviso] Fallo consulta DolarApi BCV: {e}")

    # 2. Scraping directo de bcv.org.ve
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        async with httpx.AsyncClient(timeout=3.0, verify=False) as client:
            resp = await client.get("https://www.bcv.org.ve", headers=headers)
            if resp.status_code == 200:
                match = re.search(r'id=["\']dolar["\'].*?<strong>\s*([0-9.,]+)\s*</strong>', resp.text, re.DOTALL)
                if match:
                    raw_val = match.group(1).replace(".", "").replace(",", ".")
                    tasa_val = float(raw_val)
                    if tasa_val > 0:
                        return Decimal(f"{tasa_val:.4f}"), "bcv_directo"
    except Exception as e:
        print(f"[Aviso] Fallo scraping directo BCV: {e}")

    # 3. PyDolarVenezuela
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get("https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv")
            if resp.status_code == 200:
                data = resp.json()
                price = data.get("monitors", {}).get("usd", {}).get("price")
                if price:
                    return Decimal(f"{float(price):.4f}"), "bcv_pydolar"
    except Exception as e:
        print(f"[Aviso] Fallo consulta PyDolar: {e}")

    # 4. Fallback por defecto
    return Decimal(str(settings.TASA_BCV_DEFAULT)), "default_offline"


async def obtener_tasa_actual(db: AsyncSession) -> TasaCambio:
    """
    Obtiene la tasa activa actual en base de datos.
    Si no existe ninguna tasa registrada, consulta el BCV y la guarda automáticamente.
    """
    query = (
        select(TasaCambio)
        .where(TasaCambio.activa == True)
        .order_by(desc(TasaCambio.fecha_actualizacion))
    )
    result = await db.execute(query)
    tasa_db = result.scalars().first()

    if not tasa_db:
        # Inicializar tasa consultando BCV
        tasa_val, fuente = await consultar_tasa_bcv_en_linea()
        tasa_db = TasaCambio(
            tasa=tasa_val,
            fuente=fuente,
            activa=True,
            fecha_actualizacion=datetime.now(timezone.utc),
        )
        db.add(tasa_db)
        await db.commit()
        await db.refresh(tasa_db)

    return tasa_db


async def actualizar_tasa_desde_bcv(db: AsyncSession, usuario_id: Optional[int] = None) -> TasaCambio:
    """
    Fuerza la actualización de la tasa con el valor oficial del BCV.
    Desactiva las tasas anteriores y establece la nueva como activa.
    """
    tasa_val, fuente = await consultar_tasa_bcv_en_linea(force_refresh=True)

    # Desactivar anteriores
    await db.execute(
        update(TasaCambio).values(activa=False)
    )

    nueva_tasa = TasaCambio(
        tasa=tasa_val,
        fuente=fuente,
        activa=True,
        fecha_actualizacion=datetime.now(timezone.utc),
        actualizado_por=usuario_id,
    )
    db.add(nueva_tasa)
    await db.commit()
    await db.refresh(nueva_tasa)
    return nueva_tasa


async def fijar_tasa_manual(
    db: AsyncSession,
    valor_tasa: Decimal,
    usuario_id: Optional[int] = None,
) -> TasaCambio:
    """
    Establece una tasa manual personalizada (por ejemplo, si el usuario desea ajustar
    su propia tasa de cobro en Bs. para el día).
    """
    if valor_tasa <= Decimal("0.0000"):
        raise ValueError("La tasa debe ser mayor a cero.")

    # Desactivar anteriores
    await db.execute(
        update(TasaCambio).values(activa=False)
    )

    nueva_tasa = TasaCambio(
        tasa=Decimal(f"{valor_tasa:.4f}"),
        fuente="manual",
        activa=True,
        fecha_actualizacion=datetime.now(timezone.utc),
        actualizado_por=usuario_id,
    )
    db.add(nueva_tasa)
    await db.commit()
    await db.refresh(nueva_tasa)
    return nueva_tasa
