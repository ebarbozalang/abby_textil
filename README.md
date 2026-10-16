# 🧵 Sistema de Gestión Textil — "TEXTIL-APP"

Sistema integral para empresas de confección y fabricación textil bajo pedido con trazabilidad total (Corte ➔ Impresión ➔ Confección ➔ Entrega), control de anticipos, créditos a clientes y cálculo de nómina por producción o sueldo fijo.

---

## 🛠️ Stack Tecnológico
- **Backend:** Python 3.11+ / FastAPI / SQLAlchemy 2.0 (async) / Pydantic v2 / Alembic / JWT + Bcrypt
- **Frontend:** React 18+ / Vite / TailwindCSS / Zustand / React Router v6 / Lucide Icons
- **Base de Datos:** PostgreSQL 15+ (Producción) / SQLite (Desarrollo local rápido)
- **Despliegue:** Docker, Docker Compose, Nginx

---

## 🚀 Puesta en Marcha Rápida

### Opción A: Con Docker Compose (Producción o pruebas completas)
```bash
docker-compose up --build
```
- Frontend: `http://localhost`
- API Backend & Swagger Docs: `http://localhost/docs` o `http://localhost:8000/docs`

### Opción B: Desarrollo Local sin Docker

#### 1. Backend
```bash
cd backend
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
La base de datos SQLite `textil_app.db` y el usuario inicial se crearán automáticamente.
- Swagger API Docs: `http://localhost:8000/docs`

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
- Frontend en desarrollo: `http://localhost:5173`

---

## 🔐 Credenciales Iniciales por Defecto

- **Email:** `admin@textilapp.com`
- **Contraseña:** `admin123`
- **Rol:** `superusuario` (acceso a todos los módulos)
