from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class ConfiguracionEmpresa(Base):
    """
    Configuración global de la empresa, identidad visual y tema del sistema.
    Almacena los datos fiscales, logotipo e identidad de marca (AbbySoft Textil).
    """
    __tablename__ = "configuracion_empresa"

    id = Column(Integer, primary_key=True, index=True)
    nombre_empresa = Column(String(200), default="Inversiones AbbySoft Textil C.A.", nullable=False)
    rif = Column(String(50), default="J-40812345-6", nullable=False)
    direccion = Column(
        Text,
        default="Av. Bolívar Este, C.C. Galerías Plaza, Nivel 1, Local 42, Maracay, Aragua, Venezuela",
        nullable=False,
    )
    correo = Column(String(150), default="contacto@abbysoft.com.ve", nullable=False)
    telefonos = Column(String(100), default="+58 412 1234567 / +58 243 2345678", nullable=False)
    slogan = Column(String(255), default="Tu Visión, Nuestro Código.", nullable=True)
    logo_url = Column(Text, default="/logo.png", nullable=True)
    theme_mode = Column(String(20), default="dark", nullable=False)  # 'dark' o 'light'
    color_primario = Column(String(30), default="#7B0078", nullable=False)  # Violeta AbbySoft
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
