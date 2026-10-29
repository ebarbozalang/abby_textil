# Manual de Usuario — AbbySoft Textil
### Sistema de Gestión para Empresas Textiles
**Versión 1.0 · Octubre 2026**

---

> [!IMPORTANT]
> Este manual está dirigido a administradores y operadores del sistema AbbySoft Textil. Léalo completo antes de comenzar a operar el sistema en producción.

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Inicio Rápido](#2-inicio-rápido)
3. [Inicio de Sesión y Roles](#3-inicio-de-sesión-y-roles)
4. [Dashboard Principal](#4-dashboard-principal)
5. [Módulo Clientes](#5-módulo-clientes)
6. [Módulo Catálogo y Prendas](#6-módulo-catálogo-y-prendas)
7. [Módulo Ventas y Pedidos](#7-módulo-ventas-y-pedidos)
8. [Módulo Producción y QR](#8-módulo-producción-y-qr)
9. [Módulo Trabajadores y Nóminas](#9-módulo-trabajadores-y-nóminas)
10. [Módulo Tesorería y Créditos](#10-módulo-tesorería-y-créditos)
11. [Módulo Reportes y KPIs](#11-módulo-reportes-y-kpis)
12. [Módulo Configuración de Empresa](#12-módulo-configuración-de-empresa)
13. [Tasa de Cambio BCV](#13-tasa-de-cambio-bcv)
14. [Pruebas Funcionales](#14-pruebas-funcionales)
15. [Guía de Captura de Pantalla](#15-guía-de-captura-de-pantalla)
16. [Guía para Grabar el Video Tutorial](#16-guía-para-grabar-el-video-tutorial)
17. [Solución de Problemas Frecuentes](#17-solución-de-problemas-frecuentes)

---

## 1. Introducción

**AbbySoft Textil** es un sistema de gestión empresarial (ERP) diseñado específicamente para empresas del sector textil en Venezuela. Integra en una sola plataforma web los procesos de:

- 🧵 **Producción** (corte, impresión, confección)
- 🛒 **Ventas y Pedidos** (con anticipo mínimo del 30 %)
- 👥 **Clientes y Créditos** (saldo, historial, límite de crédito)
- 👕 **Catálogo de Prendas** (variantes, SKU, stock)
- 💰 **Tesorería** (métodos de pago venezolanos: Pago Móvil, Zelle, Efectivo USD/Bs.)
- 📊 **Reportes y KPIs** (con exportación CSV y soporte de doble moneda)
- ⚙️ **Configuración** (logo, datos fiscales, tema Dark/Light, paleta de colores)

### Arquitectura General

```
┌─────────────────────────────────────────┐
│         Navegador Web (Puerto 5173)      │
│         React + Vite + Tailwind CSS     │
└──────────────────┬──────────────────────┘
                   │ API REST (JSON)
┌──────────────────▼──────────────────────┐
│       Backend FastAPI (Puerto 8000)      │
│       Python 3.x · Uvicorn · JWT        │
└──────────────────┬──────────────────────┘
                   │ SQLAlchemy ORM
┌──────────────────▼──────────────────────┐
│       PostgreSQL 12 (Puerto 5432)        │
│       Base de datos: abby_textil         │
└─────────────────────────────────────────┘
```

### Requisitos del Sistema

| Componente | Versión Mínima |
|---|---|
| Sistema Operativo | Windows 10 / 11 |
| Node.js | 18+ |
| Python | 3.10+ |
| PostgreSQL | 12+ |
| Navegador | Chrome 110+, Edge 110+, Firefox 110+ |
| RAM | 4 GB (8 GB recomendado) |

---

## 2. Inicio Rápido

### 2.1 Verificar que PostgreSQL esté activo

1. Presionar `Win + R`, escribir `services.msc` y presionar Enter
2. Buscar el servicio **postgresql-x64-12**
3. Verificar que el estado sea **En ejecución**

📸 `[CAPTURA: Ventana Servicios de Windows mostrando postgresql-x64-12 en estado "En ejecución"]`

Si no está activo, hacer clic derecho → **Iniciar**.

### 2.2 Iniciar el Backend

1. Navegar a `C:\Users\mlk\Documents\abby_textil\`
2. Hacer doble clic en **`iniciar_backend.bat`**
3. Se abrirá una ventana de consola. Esperar hasta ver:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
   ```

📸 `[CAPTURA: Ventana de consola con el mensaje de Uvicorn iniciado correctamente]`

> [!NOTE]
> El backend expone la documentación interactiva de la API en: **http://localhost:8000/docs**

### 2.3 Iniciar el Frontend

1. En la misma carpeta, hacer doble clic en **`iniciar_frontend.bat`**
2. Se abrirá otra ventana de consola. Esperar hasta ver:
   ```
     VITE v5.x.x  ready in XXX ms
     ➜  Local:   http://localhost:5173/
   ```

📸 `[CAPTURA: Ventana de consola con el mensaje de Vite listo]`

### 2.4 Abrir el Sistema en el Navegador

1. Abrir Chrome o Edge
2. Navegar a: **http://localhost:5173**
3. Se mostrará la pantalla de inicio de sesión de AbbySoft Textil

📸 `[CAPTURA: Pantalla de inicio de sesión de AbbySoft Textil con el logo violeta]`

---

## 3. Inicio de Sesión y Roles

### 3.1 Pantalla de Login

La pantalla de inicio de sesión solicita:
- **Correo electrónico**
- **Contraseña**

📸 `[CAPTURA: Formulario de login con campos email y contraseña]`

### 3.2 Credenciales por Defecto

| Rol | Correo | Contraseña | Acceso |
|---|---|---|---|
| Superusuario | `admin@textilapp.com` | `admin123` | Acceso total |

> [!CAUTION]
> Cambiar la contraseña predeterminada inmediatamente después del primer inicio de sesión en un entorno de producción.

### 3.3 Roles del Sistema

| Rol | Descripción | Módulos Disponibles |
|---|---|---|
| **superusuario** | Control total del sistema | Todos los módulos + Configuración |
| **administrador** | Gestión operativa completa | Todos excepto ajustes de sistema |
| **vendedor** | Gestión de clientes y pedidos | Clientes, Pedidos, Reportes básicos |
| **trabajador** | Portal operario (solo producción) | Órdenes asignadas, escaneo QR |

### 3.4 Proceso de Inicio de Sesión

1. Ingresar el correo electrónico en el campo **"Correo electrónico"**
2. Ingresar la contraseña en el campo **"Contraseña"**
3. Hacer clic en el botón **"Ingresar"**
4. Si las credenciales son correctas → redirige al Dashboard
5. Si son incorrectas → mensaje de error en rojo: "Credenciales inválidas"

📸 `[CAPTURA: Dashboard principal después de login exitoso]`

### 3.5 Cerrar Sesión

- Hacer clic en el ícono de usuario (esquina superior derecha)
- Seleccionar **"Cerrar Sesión"**

---

## 4. Dashboard Principal

El Dashboard es la pantalla principal del sistema. Muestra un resumen ejecutivo en tiempo real.

📸 `[CAPTURA: Dashboard completo con todos los KPIs y widgets]`

### 4.1 KPIs Principales

| Widget | Descripción |
|---|---|
| **Ventas del Mes** | Total en USD y Bs. del mes actual |
| **Pedidos Activos** | Cantidad de pedidos en proceso |
| **Clientes Registrados** | Total de clientes en el sistema |
| **Stock Bajo** | Productos con inventario por debajo del mínimo |
| **Producción Pendiente** | Órdenes de producción sin completar |
| **Tasa BCV** | Tipo de cambio USD/Bs. vigente |

### 4.2 Gráficos del Dashboard

- **Gráfico de Ventas**: Tendencia mensual de ventas en USD
- **Gráfico de Producción**: Estado de órdenes (pendiente / en proceso / completado)
- **Top Clientes**: Los 5 clientes con mayor volumen de compra

📸 `[CAPTURA: Sección de gráficos del dashboard]`

### 4.3 Barra de Navegación Lateral

La barra izquierda contiene todos los módulos del sistema. El ítem activo se resalta en violeta (`#7B0078`).

📸 `[CAPTURA: Menú lateral con todos los ítems visibles]`

---

## 5. Módulo Clientes

Ruta: **`/clientes`** → Menú lateral → **Clientes**

### 5.1 Lista de Clientes

Muestra todos los clientes registrados con columnas:
- Nombre / Razón Social
- RIF / Cédula
- Teléfono
- Saldo de crédito disponible
- Estado (Activo / Inactivo)

📸 `[CAPTURA: Tabla de lista de clientes con datos de ejemplo]`

**Funciones disponibles:**
- 🔍 **Buscar** por nombre, RIF o teléfono
- ✏️ **Editar** cliente (botón de lápiz)
- 🗑️ **Desactivar** cliente
- ➕ **Nuevo Cliente** (botón superior derecho)

### 5.2 Crear Nuevo Cliente

1. Clic en **"+ Nuevo Cliente"**
2. Completar el formulario:

| Campo | Descripción | Requerido |
|---|---|---|
| Nombre / Razón Social | Nombre completo o empresa | ✅ |
| RIF / Cédula | Formato: J-XXXXXXXX-X o V-XXXXXXXX | ✅ |
| Correo electrónico | Email de contacto | ✅ |
| Teléfono | Número con código de área | ✅ |
| Dirección | Dirección fiscal completa | ✅ |
| Límite de Crédito (USD) | Máximo de crédito permitido | ✅ |
| Notas | Observaciones adicionales | ❌ |

3. Clic en **"Guardar"**

📸 `[CAPTURA: Formulario de nuevo cliente con campos completados]`

### 5.3 Ver Detalle del Cliente

Al hacer clic en el nombre del cliente se abre el panel de detalle con:
- **Datos generales** del cliente
- **Historial de pedidos** (con estado y montos)
- **Historial de pagos**
- **Saldo de crédito disponible**
- **Límite de crédito**

📸 `[CAPTURA: Panel de detalle del cliente con historial de pedidos]`

### 5.4 Gestión de Crédito

- El **saldo de crédito** aumenta cuando se registra un pago
- Disminuye al crear un pedido que usa crédito
- El sistema **bloquea** nuevos pedidos si el cliente supera su límite

> [!WARNING]
> Si el cliente tiene saldo pendiente mayor a su límite de crédito, el sistema no permitirá crear nuevos pedidos hasta que realice un pago.

---

## 6. Módulo Catálogo y Prendas

Ruta: **`/catalogo`** → Menú lateral → **Catálogo**

### 6.1 Lista de Productos

📸 `[CAPTURA: Grilla de productos con imágenes, nombre y precio]`

La vista muestra productos en formato de tarjetas (cards) con:
- Imagen del producto
- Nombre de la prenda
- Categoría (Camisas, Pantalones, Vestidos, etc.)
- Precio base en USD
- Stock total disponible

### 6.2 Crear Nuevo Producto

1. Clic en **"+ Nuevo Producto"**
2. Completar información básica:

| Campo | Descripción |
|---|---|
| Nombre | Nombre de la prenda |
| Descripción | Descripción detallada |
| Categoría | Seleccionar de lista predefinida |
| Precio Base (USD) | Precio de venta en dólares |
| Costo de Producción | Costo interno por unidad |

📸 `[CAPTURA: Formulario de creación de producto, pestaña "Información General"]`

### 6.3 Gestión de Variantes y SKU

Cada producto puede tener múltiples variantes por **talla** y **color**:

1. En la pestaña **"Variantes"** del formulario de producto
2. Clic en **"+ Agregar Variante"**
3. Completar:
   - **Talla**: XS, S, M, L, XL, XXL (o tallas numéricas)
   - **Color**: Nombre del color
   - **SKU**: Código único generado automáticamente (ej: `CAM-AZ-M-001`)
   - **Stock**: Cantidad disponible

📸 `[CAPTURA: Tabla de variantes con SKUs generados automáticamente]`

> [!TIP]
> El SKU se genera automáticamente combinando: `[3 letras producto]-[2 letras color]-[talla]-[correlativo]`. Puede editarse manualmente si lo requiere.

### 6.4 Control de Stock

- El stock se actualiza automáticamente al **crear pedidos** (resta) y al **registrar producción** (suma)
- Los productos con stock por debajo del mínimo aparecen en el **Dashboard** como alertas
- Para ajuste manual de stock: botón **"Ajuste de Inventario"** en el detalle del producto

---

## 7. Módulo Ventas y Pedidos

Ruta: **`/pedidos`** → Menú lateral → **Pedidos**

### 7.1 Lista de Pedidos

📸 `[CAPTURA: Tabla de pedidos con columnas: número, cliente, fecha, total, estado, anticipo]`

Columnas de la tabla:
- **N° Pedido** (correlativo)
- **Cliente**
- **Fecha**
- **Total (USD)**
- **Anticipo Pagado**
- **Saldo Pendiente**
- **Estado**

### 7.2 Estados del Flujo de Pedidos

```
BORRADOR → CONFIRMADO → EN PRODUCCIÓN → LISTO → ENTREGADO
                                                     ↑
                                               (con pago total)
```

| Estado | Color | Significado |
|---|---|---|
| Borrador | ⚪ Gris | En edición, no comprometido |
| Confirmado | 🔵 Azul | Aprobado, anticipo pagado |
| En Producción | 🟡 Amarillo | Órdenes de corte/confección activas |
| Listo | 🟢 Verde | Producción completada, esperando entrega |
| Entregado | ✅ Violeta | Completado y pagado |
| Cancelado | 🔴 Rojo | Anulado |

### 7.3 Crear Nuevo Pedido

1. Clic en **"+ Nuevo Pedido"**
2. Seleccionar **cliente** del desplegable
3. Seleccionar **fecha de entrega estimada**
4. Agregar **líneas de pedido**:
   - Buscar producto por nombre o SKU
   - Seleccionar variante (talla/color)
   - Ingresar cantidad
   - El precio se carga automáticamente del catálogo (editable)
5. El sistema calcula automáticamente:
   - Subtotal por línea
   - Total del pedido
   - **Anticipo mínimo requerido (30 %)**

📸 `[CAPTURA: Formulario de nuevo pedido con líneas de productos agregadas]`

### 7.4 Anticipo Mínimo del 30 %

> [!IMPORTANT]
> El sistema requiere un anticipo mínimo del **30 % del total** para confirmar un pedido. Sin este anticipo, el pedido permanece en estado "Borrador".

Proceso de pago del anticipo:
1. Desde el pedido en estado **Borrador**, clic en **"Registrar Anticipo"**
2. Seleccionar método de pago
3. Ingresar monto (mínimo 30 % del total)
4. El pedido pasa automáticamente a estado **"Confirmado"**

📸 `[CAPTURA: Modal de registro de anticipo con monto calculado automáticamente]`

### 7.5 Ver Detalle del Pedido

El detalle muestra:
- Información del cliente y fechas
- Tabla de líneas (producto, variante, cantidad, precio, subtotal)
- Historial de pagos registrados
- QR del pedido (para escaneo en producción)
- Botones de acción según el estado actual

📸 `[CAPTURA: Detalle completo del pedido con QR visible]`

---

## 8. Módulo Producción y QR

Ruta: **`/produccion`** → Menú lateral → **Producción**

### 8.1 Tipos de Órdenes de Producción

El módulo maneja tres tipos de órdenes:

| Tipo | Descripción | Responsable |
|---|---|---|
| **Corte** | Corte de telas según patrones | Cortador |
| **Impresión** | Estampados, serigrafía | Impresor |
| **Confección** | Costura y acabados | Costurero/a |

### 8.2 Crear Orden de Producción

Las órdenes se crean desde un pedido confirmado:

1. Abrir el detalle del pedido
2. Clic en **"Generar Órdenes de Producción"**
3. El sistema propone las órdenes basándose en las prendas del pedido
4. Asignar **trabajador responsable** a cada orden
5. Establecer **fecha límite** de cada orden
6. Clic en **"Crear Órdenes"**

📸 `[CAPTURA: Panel de creación de órdenes de producción con trabajadores asignados]`

### 8.3 Seguimiento con Código QR

Cada orden de producción tiene un **código QR único** que permite:
- Registrar el inicio de trabajo (escaneo = "En proceso")
- Registrar la finalización (segundo escaneo = "Completado")
- Ver el historial de escaneos con timestamp y operario

**Imprimir el QR:**
1. Abrir la orden de producción
2. Clic en **"Imprimir QR"**
3. Se abre una vista de impresión con el código QR y los datos de la orden

📸 `[CAPTURA: Código QR de orden de producción listo para imprimir]`

### 8.4 Portal del Trabajador (Escaneo QR)

El portal del trabajador está disponible en la misma URL:
- Login con cuenta de rol **"trabajador"**
- Solo muestra las **órdenes asignadas** a ese trabajador
- Botón **"Escanear QR"** para actualizar el estado de la orden
- Vista simplificada, optimizada para tabletas

📸 `[CAPTURA: Portal del trabajador con lista de órdenes asignadas]`

### 8.5 Tablero Kanban de Producción

La vista principal de Producción muestra un **tablero Kanban** con columnas:

```
PENDIENTE | EN PROCESO | COMPLETADO | CANCELADO
```

Las tarjetas muestran: prenda, talla, cantidad, trabajador asignado, fecha límite.

📸 `[CAPTURA: Tablero Kanban de producción con órdenes en diferentes estados]`

---

## 9. Módulo Trabajadores y Nóminas

Ruta: **`/trabajadores`** → Menú lateral → **Trabajadores**

### 9.1 Lista de Trabajadores

📸 `[CAPTURA: Tabla de trabajadores con nombre, cargo, salario y estado]`

### 9.2 Crear Nuevo Trabajador

1. Clic en **"+ Nuevo Trabajador"**
2. Completar el formulario:

| Campo | Descripción |
|---|---|
| Nombre Completo | Nombre y apellidos |
| Cédula de Identidad | V- o E- + número |
| Cargo / Rol | Cortador, Impresor, Costurero, Vendedor, Admin |
| Salario Base (USD) | Remuneración mensual en dólares |
| Teléfono | Número de contacto |
| Email | Correo (usado también para login) |
| Contraseña | Para acceso al portal |
| Fecha de Ingreso | Fecha de inicio |

📸 `[CAPTURA: Formulario de nuevo trabajador con todos los campos]`

### 9.3 Gestión de Nóminas

**Ver nómina del período:**
1. Ir a **Trabajadores** → pestaña **"Nómina"**
2. Seleccionar **mes** y **año**
3. El sistema muestra la nómina calculada con:
   - Salario base
   - Bonificaciones
   - Deducciones (IVSS, LPH según ley venezolana)
   - Neto a pagar

📸 `[CAPTURA: Tabla de nómina mensual con deducciones y neto a pagar]`

**Liquidar Nómina:**
1. Revisar los montos calculados
2. Clic en **"Liquidar Nómina"**
3. Seleccionar el método de pago
4. El sistema registra los pagos y genera los recibos

📸 `[CAPTURA: Modal de liquidación de nómina con resumen total]`

---

## 10. Módulo Tesorería y Créditos

Ruta: **`/tesoreria`** → Menú lateral → **Tesorería**

### 10.1 Métodos de Pago Soportados

El sistema soporta todos los métodos de pago del mercado venezolano:

| Método | Moneda | Descripción |
|---|---|---|
| **Pago Móvil** | Bs. | Transferencia interbancaria móvil |
| **Transferencia Bancaria** | Bs. | Transferencia bancaria tradicional |
| **Zelle** | USD | Transferencia internacional |
| **Efectivo USD** | USD | Pago en dólares en efectivo |
| **Efectivo Bs.** | Bs. | Pago en bolívares en efectivo |
| **Binance / USDT** | USDT | Criptomoneda (stablecoin) |
| **Tarjeta de Débito/Crédito** | Bs. | Pago con terminal punto de venta |
| **Crédito** | USD | Usando el crédito disponible del cliente |

### 10.2 Registrar un Pago

1. Desde el pedido o desde **Tesorería → "Nuevo Pago"**
2. Seleccionar el **pedido** al que aplica
3. Seleccionar el **método de pago**
4. Ingresar el **monto**
5. Si aplica: ingresar el **número de referencia** (Pago Móvil, Zelle, etc.)
6. Adjuntar comprobante (imagen, opcional)
7. Clic en **"Registrar Pago"**

📸 `[CAPTURA: Formulario de registro de pago con método "Pago Móvil" seleccionado]`

### 10.3 Gestión de Créditos

**Otorgar crédito a un cliente:**
- Se define el **límite de crédito** en el perfil del cliente
- El crédito se usa como método de pago al crear pedidos

**Abonar al crédito:**
1. Ir a **Tesorería → "Abonos a Crédito"**
2. Seleccionar el cliente
3. Registrar el pago recibido
4. El saldo de crédito disponible se actualiza automáticamente

📸 `[CAPTURA: Panel de abonos a crédito con historial del cliente]`

### 10.4 Conciliación y Reportes de Caja

- **Resumen diario**: Total de pagos recibidos por método de pago
- **Cierre de caja**: Exportar el resumen del día en CSV
- Los montos en Bs. se convierten automáticamente a USD usando la **tasa BCV vigente**

---

## 11. Módulo Reportes y KPIs

Ruta: **`/reportes`** → Menú lateral → **Reportes**

### 11.1 Tipos de Reportes Disponibles

El módulo ofrece **6 tipos de reportes**:

| # | Reporte | Descripción |
|---|---|---|
| 1 | **Ventas por Período** | Ventas totales en un rango de fechas |
| 2 | **Producción** | Estado de órdenes, tiempos, trabajadores |
| 3 | **Clientes y Créditos** | Saldos, límites, historial de pagos |
| 4 | **Inventario / Stock** | Niveles de stock por producto y variante |
| 5 | **Nómina** | Resumen de pagos a trabajadores por período |
| 6 | **Flujo de Caja** | Entradas y salidas por método de pago |

📸 `[CAPTURA: Pantalla principal de Reportes con los 6 tipos de reportes disponibles]`

### 11.2 Generar un Reporte

1. Seleccionar el **tipo de reporte**
2. Definir el **rango de fechas** (fecha inicio y fecha fin)
3. Aplicar **filtros adicionales** según el tipo:
   - Por cliente, por trabajador, por producto, por método de pago
4. Clic en **"Generar Reporte"**

📸 `[CAPTURA: Formulario de generación de reporte con filtros aplicados]`

### 11.3 Visualización de Resultados

Los resultados se muestran en:
- **Tabla de datos** con todos los registros
- **Gráfico resumido** (barras o líneas según el tipo)
- **Totales y subtotales** al pie de la tabla

📸 `[CAPTURA: Reporte de Ventas por Período con gráfico de barras y tabla de datos]`

### 11.4 Exportar a CSV

1. Con el reporte generado, clic en **"Exportar CSV"**
2. El archivo se descarga automáticamente con el nombre: `reporte_ventas_2026-10-01_2026-10-31.csv`
3. Compatible con Excel, LibreOffice Calc, Google Sheets

📸 `[CAPTURA: Botón de "Exportar CSV" y diálogo de descarga del navegador]`

### 11.5 Doble Moneda

Todos los reportes monetarios muestran:
- Columna **USD** (moneda principal)
- Columna **Bs.** (calculado con la tasa BCV del día)
- La tasa utilizada se muestra al pie del reporte

---

## 12. Módulo Configuración de Empresa

Ruta: **`/configuracion`** → Menú lateral → **Configuración** *(solo Superusuario/Admin)*

### 12.1 Datos de la Empresa

📸 `[CAPTURA: Formulario de Configuración de Empresa con todos los campos]`

| Campo | Descripción |
|---|---|
| **Nombre de la Empresa** | Razón social que aparece en documentos e informes |
| **RIF** | Registro de Información Fiscal (formato: J-XXXXXXXX-X) |
| **Dirección** | Dirección fiscal completa |
| **Correo Electrónico** | Email corporativo de contacto |
| **Teléfonos** | Números de contacto (separados por coma) |

### 12.2 Logotipo

1. En la sección **"Logotipo"**, clic en **"Seleccionar Imagen"**
2. Elegir un archivo `.png`, `.jpg` o `.webp` (máx. 2 MB)
3. Se muestra una **vista previa** del logo
4. El logo aparece en:
   - La barra superior del sistema
   - Los encabezados de reportes imprimibles
   - La pantalla de login

📸 `[CAPTURA: Sección de carga de logotipo con vista previa del logo AbbySoft]`

### 12.3 Personalización de Colores

En la sección **"Paleta de Colores"**:

| Configuración | Predeterminado |
|---|---|
| Color Principal | `#7B0078` (Violeta AbbySoft) |
| Color Secundario | `#A855F7` (Violeta claro) |
| Color de Acento | `#C084FC` (Lavanda) |

Para cambiar un color:
1. Clic en el cuadro de color
2. Usar el selector de color o ingresar el código hexadecimal
3. La interfaz se actualiza en **tiempo real** para previsualizar

📸 `[CAPTURA: Selector de color con la paleta actual activa]`

### 12.4 Tema Dark / Light

El sistema soporta dos temas:

| Tema | Descripción |
|---|---|
| **Oscuro (Dark)** ⭐ Predeterminado | Fondo oscuro, texto claro. Reduce fatiga visual |
| **Claro (Light)** | Fondo blanco, estilo clásico |

**Cambiar el tema:**
- Opción 1: En **Configuración** → sección **"Apariencia"** → selector de tema
- Opción 2: Botón de luna/sol 🌙☀️ en la barra superior (cambio inmediato)

📸 `[CAPTURA: Comparación del sistema en modo Dark vs. modo Light]`

### 12.5 Guardar la Configuración

- Clic en **"Guardar Configuración"**
- Los cambios se aplican inmediatamente en toda la aplicación
- Para restaurar los valores predeterminados: **"Restablecer Predeterminados"**

---

## 13. Tasa de Cambio BCV

### 13.1 Sincronización Automática

El sistema sincroniza automáticamente la tasa USD/Bs. publicada por el **Banco Central de Venezuela (BCV)**:

- La sincronización ocurre **diariamente a las 4:00 PM** (hora de publicación BCV)
- La tasa actualizada aparece en el **Dashboard** (widget superior derecho)
- Todos los cálculos en bolívares usan la tasa vigente

📸 `[CAPTURA: Widget de Tasa BCV en el Dashboard mostrando la tasa actual]`

### 13.2 Ajuste Manual de la Tasa

En casos donde la tasa oficial no esté disponible o se requiera usar una tasa diferente:

1. Ir a **Dashboard** → Widget "Tasa BCV" → clic en el ícono de lápiz ✏️
2. Ingresar la nueva tasa manualmente
3. Clic en **"Actualizar"**

📸 `[CAPTURA: Modal de ajuste manual de la tasa BCV]`

> [!NOTE]
> La tasa manual tiene vigencia hasta que el sistema realice la próxima sincronización automática.

---

## 14. Pruebas Funcionales

### 14.1 Tabla de Casos de Prueba

La siguiente tabla documenta los casos de prueba funcionales del sistema:

| # | Módulo | Descripción del Test | Pasos | Resultado Esperado | Estado |
|---|---|---|---|---|---|
| TC-001 | Auth | Login con credenciales válidas | 1. Ir a `/login` 2. Ingresar `admin@textilapp.com` / `admin123` 3. Clic en "Ingresar" | Redirige al Dashboard. JWT almacenado en localStorage | ✅ PASS |
| TC-002 | Auth | Login con contraseña incorrecta | 1. Ingresar email válido 2. Ingresar contraseña incorrecta 3. Clic en "Ingresar" | Mensaje de error "Credenciales inválidas". No redirige | ✅ PASS |
| TC-003 | Auth | Cerrar sesión | 1. Estar logueado 2. Clic en ícono de usuario 3. Seleccionar "Cerrar Sesión" | Redirige a `/login`. JWT eliminado del localStorage | ✅ PASS |
| TC-004 | Clientes | Crear cliente nuevo | 1. Ir a Clientes 2. Clic en "+ Nuevo Cliente" 3. Llenar todos los campos 4. Clic en "Guardar" | Cliente aparece en la lista. Mensaje de éxito verde | ✅ PASS |
| TC-005 | Clientes | Crear cliente sin RIF (campo requerido) | 1. Abrir formulario de nuevo cliente 2. No llenar el campo RIF 3. Clic en "Guardar" | Mensaje de error "El RIF es requerido". No se guarda | ✅ PASS |
| TC-006 | Clientes | Buscar cliente por nombre | 1. Ir a Clientes 2. Escribir nombre en el buscador | La tabla filtra mostrando solo el cliente buscado | ✅ PASS |
| TC-007 | Catálogo | Crear producto con variantes | 1. Ir a Catálogo 2. "+ Nuevo Producto" 3. Llenar datos 4. Agregar 3 variantes (tallas) 5. Guardar | Producto creado con 3 SKUs generados. Aparece en catálogo | ✅ PASS |
| TC-008 | Catálogo | Verificar generación de SKU | 1. Crear variante con color "Azul" y talla "M" | SKU generado en formato: `[PROD]-AZ-M-001` | ✅ PASS |
| TC-009 | Pedidos | Crear pedido completo con anticipo | 1. Ir a Pedidos 2. "+ Nuevo Pedido" 3. Seleccionar cliente 4. Agregar líneas 5. Registrar anticipo 30% | Pedido pasa de Borrador a Confirmado. Total y anticipo calculados correctamente | ✅ PASS |
| TC-010 | Pedidos | Intentar confirmar sin anticipo | 1. Crear pedido 2. Intentar confirmar sin pago | Sistema bloquea confirmación. Mensaje: "Se requiere anticipo mínimo del 30%" | ✅ PASS |
| TC-011 | Pedidos | Flujo completo de estados | 1. Crear y confirmar pedido 2. Generar órdenes de producción 3. Completar producción 4. Registrar pago final 5. Marcar como entregado | Pedido pasa por todos los estados correctamente | ✅ PASS |
| TC-012 | Producción | Crear orden de corte | 1. Desde pedido confirmado 2. "Generar Órdenes de Producción" 3. Asignar trabajador a orden de corte 4. Guardar | Orden aparece en tablero Kanban en columna "Pendiente" | ✅ PASS |
| TC-013 | Producción | Imprimir QR de orden | 1. Abrir orden de producción 2. Clic en "Imprimir QR" | Se abre vista de impresión con QR válido y datos de la orden | ✅ PASS |
| TC-014 | Producción | Actualizar estado con escaneo QR (portal trabajador) | 1. Loguear como trabajador 2. Escanear QR de orden asignada | Estado de la orden cambia a "En Proceso". Registro de timestamp | ✅ PASS |
| TC-015 | Trabajadores | Crear nuevo trabajador con acceso | 1. Ir a Trabajadores 2. "+ Nuevo Trabajador" 3. Llenar datos incluyendo email y contraseña 4. Guardar | Trabajador creado. Login funciona con sus credenciales | ✅ PASS |
| TC-016 | Nómina | Calcular nómina mensual | 1. Ir a Trabajadores → Nómina 2. Seleccionar mes y año 3. Generar | Tabla muestra salarios, deducciones y neto de todos los trabajadores | ✅ PASS |
| TC-017 | Tesorería | Registrar pago con Pago Móvil | 1. Ir a Tesorería → "Nuevo Pago" 2. Seleccionar pedido 3. Elegir "Pago Móvil" 4. Ingresar monto y referencia 5. Registrar | Pago registrado. Saldo pendiente del pedido se actualiza | ✅ PASS |
| TC-018 | Tesorería | Registrar pago en Zelle (USD) | 1. Similar al TC-017 con método "Zelle" | Pago en USD registrado. Equivalente en Bs. calculado con tasa BCV | ✅ PASS |
| TC-019 | Reportes | Generar reporte de ventas | 1. Ir a Reportes 2. Seleccionar "Ventas por Período" 3. Fechas: mes actual 4. Generar | Tabla y gráfico con ventas del período. Totales en USD y Bs. | ✅ PASS |
| TC-020 | Reportes | Exportar CSV | 1. Generar reporte 2. Clic en "Exportar CSV" | Archivo CSV descargado con todos los datos del reporte | ✅ PASS |
| TC-021 | Config | Cargar logo de empresa | 1. Ir a Configuración 2. Seleccionar imagen PNG 3. Guardar | Logo aparece en la barra superior y en el login | ✅ PASS |
| TC-022 | Config | Cambiar a tema oscuro | 1. Ir a Configuración 2. Seleccionar "Tema Oscuro" 3. Guardar | Toda la interfaz cambia a modo oscuro. Se persiste al recargar | ✅ PASS |
| TC-023 | Config | Cambiar color principal | 1. Ir a Configuración 2. Cambiar color principal a #FF0000 3. Guardar | La barra de navegación y botones primarios se ven en rojo | ✅ PASS |
| TC-024 | BCV | Sincronizar tasa automáticamente | 1. Observar widget de tasa en Dashboard | Tasa BCV muestra el valor publicado del día actual | ✅ PASS |
| TC-025 | BCV | Ajustar tasa manualmente | 1. Clic en ✏️ en widget BCV 2. Ingresar tasa `38.50` 3. Actualizar | Toda la app usa la tasa `38.50 Bs/$` hasta la próxima sincronización | ✅ PASS |
| TC-026 | Auth | Control de acceso por rol (trabajador no ve Reportes) | 1. Loguear como trabajador 2. Intentar navegar a `/reportes` | Acceso denegado. Redirige al portal del trabajador | ✅ PASS |
| TC-027 | Clientes | Límite de crédito — bloqueo de pedido | 1. Cliente con crédito $500, saldo usado $490 2. Intentar crear pedido de $200 con crédito | Sistema bloquea pedido. Mensaje: "Límite de crédito insuficiente" | ✅ PASS |
| TC-028 | Stock | Alerta de stock bajo | 1. Producto con stock 2 (mínimo: 5) | Widget en Dashboard muestra alerta de stock bajo para ese producto | ✅ PASS |

---

## 15. Guía de Captura de Pantalla

Para documentar el sistema o preparar material de capacitación, siga estas instrucciones:

### 15.1 Recorte Rápido (Win + Shift + S)

1. Presionar **`Win + Shift + S`** simultáneamente
2. La pantalla se oscurece y aparece la barra de herramientas de recorte
3. Opciones disponibles:
   - **Rectángulo**: Arrastrar para seleccionar área
   - **Forma libre**: Dibujar el área de captura
   - **Ventana**: Clic en la ventana a capturar
   - **Pantalla completa**: Captura todo el monitor
4. El recorte se copia al **portapapeles** automáticamente
5. Pegar con `Ctrl+V` en Word, Paint, WhatsApp, etc.

### 15.2 Game Bar — Video (Win + G)

1. Presionar **`Win + G`** para abrir la Game Bar
2. Clic en el ícono de **cámara** para captura de pantalla
3. Para grabar video: clic en el ícono de **grabación** (círculo rojo)
4. Los archivos se guardan en: `C:\Users\[usuario]\Videos\Captures\`

### 15.3 Herramienta de Recorte Clásica

1. Buscar **"Herramienta de Recorte"** en el menú Inicio
2. Clic en **"Nuevo"**
3. Seleccionar el área
4. Guardar con `Ctrl+S` como PNG o JPG

### 15.4 Carpeta Recomendada para Capturas

Guardar todas las capturas en:
```
C:\Users\mlk\Documents\abby_textil\docs\capturas\
```

Nomenclatura sugerida:
```
01_login_pantalla.png
02_dashboard_kpis.png
03_clientes_lista.png
04_nuevo_cliente_form.png
...
```

---

## 16. Guía para Grabar el Video Tutorial

### 16.1 Software Recomendado

| Software | Gratuito | Descarga |
|---|---|---|
| **OBS Studio** | ✅ Sí | https://obsproject.com |
| **Xbox Game Bar** | ✅ Sí (integrado en Windows) | `Win + G` |
| **Loom** | ✅ Sí (plan básico) | https://loom.com |
| Camtasia | ❌ De pago | — |

### 16.2 Configuración Recomendada para OBS

```
Resolución: 1920x1080 (Full HD)
FPS: 30
Formato: MP4
Audio: Micrófono del sistema (narración)
Bitrate de video: 5000 Kbps
```

### 16.3 Guión del Video Tutorial (Storyboard)

Ver el documento separado: **[guion_video_tutorial.md](./guion_video_tutorial.md)**

---

## 17. Solución de Problemas Frecuentes

| Problema | Posible Causa | Solución |
|---|---|---|
| La página muestra "Error de conexión" | El backend no está iniciado | Ejecutar `iniciar_backend.bat` y esperar el mensaje de Uvicorn |
| "Error 500" al cargar datos | PostgreSQL no está activo | Verificar en `services.msc` que `postgresql-x64-12` esté "En ejecución" |
| El login no funciona | Contraseña incorrecta o usuario no existe | Usar credenciales: `admin@textilapp.com` / `admin123` |
| Los colores no cambian después de modificar la config | Caché del navegador | Presionar `Ctrl + F5` para recarga forzada |
| La tasa BCV no se actualiza | Sin acceso a internet o API del BCV caída | Usar ajuste manual de tasa en el widget del Dashboard |
| "CORS error" en la consola del navegador | Backend en puerto diferente al esperado | Verificar que el backend esté en `http://localhost:8000` |
| Imágenes del logo no cargan | Tamaño de archivo mayor a 2 MB | Comprimir la imagen antes de subirla |
| El sistema se ve en blanco | Error de JavaScript en el frontend | Abrir DevTools (`F12`) → consola → reportar el error |

---

## Información del Sistema

| Dato | Valor |
|---|---|
| Versión del Sistema | 1.0.0 |
| Desarrollado por | AbbySoft |
| Backend | FastAPI 0.110+ / Python 3.10+ |
| Frontend | React 18 / Vite 5 / Tailwind CSS 3 |
| Base de Datos | PostgreSQL 12 |
| Licencia | Propietaria |
| Soporte | admin@abbysoft.com.ve |

---

*Manual generado el 29 de octubre de 2026 · AbbySoft Textil v1.0*
