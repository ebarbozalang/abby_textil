# Guión de Video Tutorial — AbbySoft Textil
### Sistema de Gestión Textil · Video de Capacitación
**Duración estimada: 20–25 minutos**

---

> [!IMPORTANT]
> Este guión está diseñado para ser grabado con OBS Studio o la Xbox Game Bar (`Win + G`).
> Antes de grabar, asegúrese de que el sistema esté funcionando: backend en puerto 8000, frontend en puerto 5173.

---

## Preparación Antes de Grabar

### Checklist Pre-Grabación

- [ ] PostgreSQL activo (`services.msc` → `postgresql-x64-12` en ejecución)
- [ ] Backend iniciado (`iniciar_backend.bat` → esperar mensaje de Uvicorn)
- [ ] Frontend iniciado (`iniciar_frontend.bat` → esperar mensaje de Vite)
- [ ] Navegador Chrome/Edge abierto en `http://localhost:5173`
- [ ] Resolución de pantalla: 1920×1080
- [ ] Micrófono probado y funcionando
- [ ] Cerrar aplicaciones innecesarias (Slack, correo, notificaciones de Windows)
- [ ] Modo "No molestar" activado en Windows
- [ ] OBS configurado (o Game Bar lista con `Win+G`)

### Datos de Prueba a Tener Listos

Antes de grabar, crear en el sistema:
- Al menos 2 clientes registrados
- Al menos 3 productos con variantes
- 1 pedido en estado Borrador

---

## ESCENA 0 — Introducción
**⏱ Duración: 30–45 segundos**

### Texto para Narrar:
> *"Bienvenidos al tutorial de AbbySoft Textil, el sistema de gestión diseñado especialmente para empresas del sector textil en Venezuela.*
>
> *En este video aprenderán a utilizar todas las funcionalidades del sistema: desde la gestión de clientes y pedidos, hasta el control de producción, nóminas, tesorería y generación de reportes.*
>
> *Comencemos."*

### Acciones en Pantalla:
1. Mostrar la pantalla de **login** de AbbySoft Textil (sin estar logueado)
2. Hacer zoom suave al logo de la empresa en la pantalla de login
3. Desplazar el cursor para señalar los elementos de la pantalla

---

## ESCENA 1 — Iniciar el Sistema
**⏱ Duración: 1:30–2:00 minutos**

### Texto para Narrar:
> *"Para iniciar el sistema, necesitamos arrancar dos componentes: el servidor backend y la aplicación frontend.*
>
> *Primero, navegamos a la carpeta del sistema en C:/Users/[usuario]/Documents/abby_textil.*
>
> *Hacemos doble clic en 'iniciar_backend.bat'. Esto arranca el servidor de base de datos y la API del sistema. Esperamos hasta ver el mensaje que confirma que el servidor está activo en el puerto 8000.*
>
> *Luego, hacemos doble clic en 'iniciar_frontend.bat'. Esto inicia la aplicación web. En unos segundos veremos la URL donde está disponible el sistema.*
>
> *Abrimos el navegador y vamos a http://localhost:5173"*

### Acciones en Pantalla:
1. Abrir el **Explorador de Windows** en `C:\Users\mlk\Documents\abby_textil\`
2. Hacer doble clic en `iniciar_backend.bat` → mostrar la consola
3. Esperar el mensaje de Uvicorn (apuntar con el cursor)
4. Hacer doble clic en `iniciar_frontend.bat` → mostrar la segunda consola
5. Abrir Chrome y navegar a `http://localhost:5173`
6. Mostrar la pantalla de login cargada

---

## ESCENA 2 — Inicio de Sesión
**⏱ Duración: 1:00 minuto**

### Texto para Narrar:
> *"En la pantalla de inicio de sesión, ingresamos nuestras credenciales de administrador.*
>
> *El sistema maneja diferentes roles de usuario: superusuario, administrador, vendedor y trabajador. Cada rol tiene acceso a diferentes módulos del sistema.*
>
> *Ingresamos el correo y la contraseña, y hacemos clic en 'Ingresar'."*

### Acciones en Pantalla:
1. Mostrar la pantalla de login
2. Escribir lentamente: `admin@textilapp.com` (para que se vea claramente)
3. Escribir la contraseña (se verá como puntos `●●●●●●●`)
4. Clic en el botón **"Ingresar"**
5. Mostrar la transición al Dashboard
6. Pausar 3 segundos en el Dashboard para que el espectador lo asimile

---

## ESCENA 3 — Dashboard y Tasa BCV
**⏱ Duración: 2:00–2:30 minutos**

### Texto para Narrar:
> *"Al ingresar al sistema, lo primero que vemos es el Dashboard o panel principal.*
>
> *Aquí encontramos un resumen ejecutivo de todo el negocio: las ventas del mes, los pedidos activos, el número de clientes, el stock disponible y las órdenes de producción pendientes.*
>
> *Un elemento muy importante es el widget de la Tasa BCV, aquí arriba. El sistema sincroniza automáticamente el tipo de cambio publicado por el Banco Central de Venezuela. Esta tasa se usa en todos los cálculos de doble moneda del sistema.*
>
> *Si necesitamos ajustar la tasa manualmente, hacemos clic en el ícono de lápiz y ingresamos el nuevo valor.*
>
> *En la parte inferior vemos gráficos de tendencia de ventas y el estado general de la producción."*

### Acciones en Pantalla:
1. Hacer un recorrido lento por todos los **widgets del Dashboard** (con el cursor señalando cada uno)
2. Detenerse en el widget de **Tasa BCV** (señalar con cursor)
3. Clic en el ícono de ✏️ del widget BCV → mostrar el modal → cerrar sin cambiar
4. Señalar los **gráficos** de ventas y producción
5. Señalar el **menú lateral** y sus secciones

---

## ESCENA 4 — Módulo de Clientes
**⏱ Duración: 3:00 minutos**

### Texto para Narrar:
> *"Ahora vamos al módulo de Clientes. Aquí gestionamos toda nuestra cartera de clientes.*
>
> *La vista principal muestra la lista de clientes con su información básica: nombre, RIF, teléfono, y muy importante, el saldo de crédito disponible.*
>
> *Vamos a crear un nuevo cliente. Hacemos clic en el botón 'Nuevo Cliente'.*
>
> *Completamos los datos: nombre de la empresa o persona, el RIF, que es el registro fiscal venezolano con su formato correspondiente, el correo de contacto, el teléfono, la dirección...*
>
> *Y aquí un campo muy importante: el límite de crédito. Esto define cuánto puede comprar el cliente a crédito. El sistema bloqueará nuevos pedidos si el cliente supera este límite.*
>
> *Guardamos el cliente y lo vemos aparecer en la lista."*

### Acciones en Pantalla:
1. Clic en **Clientes** en el menú lateral
2. Mostrar la **lista de clientes** (hacer scroll si hay varios)
3. Usar el **buscador** para demostrar el filtrado
4. Clic en **"+ Nuevo Cliente"**
5. Llenar el formulario campo por campo (despacio, para que se vea)
   - Nombre: "Confecciones Bolívar C.A."
   - RIF: "J-12345678-9"
   - Email: "compras@bolivar.com.ve"
   - Teléfono: "0412-555-0001"
   - Dirección: "Av. Principal, Local 5, Caracas"
   - Límite de crédito: "1500"
6. Clic en **"Guardar"**
7. Mostrar el cliente creado en la lista
8. Clic en el cliente para mostrar el **detalle** (historial vacío)

---

## ESCENA 5 — Módulo Catálogo y Prendas
**⏱ Duración: 3:00 minutos**

### Texto para Narrar:
> *"El módulo de Catálogo es donde registramos todas nuestras prendas y productos.*
>
> *Cada producto puede tener múltiples variantes: diferentes tallas y colores. Para cada combinación, el sistema genera automáticamente un código SKU único que identifica exactamente esa variante.*
>
> *Vamos a crear un nuevo producto. Hacemos clic en 'Nuevo Producto'.*
>
> *Ingresamos el nombre de la prenda, la categoría, el precio de venta en dólares y el costo de producción.*
>
> *Luego, en la pestaña de Variantes, agregamos las tallas y colores disponibles. Observen cómo el sistema genera el código SKU automáticamente.*
>
> *El stock se gestiona por variante: cada combinación talla-color tiene su propio conteo de inventario."*

### Acciones en Pantalla:
1. Clic en **Catálogo** en el menú lateral
2. Mostrar la **vista de tarjetas** de productos
3. Clic en **"+ Nuevo Producto"**
4. Llenar datos:
   - Nombre: "Camisa Polo Corporativa"
   - Categoría: "Camisas"
   - Precio: "25.00"
   - Costo: "12.00"
5. Ir a la pestaña **"Variantes"**
6. Agregar 3 variantes:
   - Azul / S / Stock 10
   - Azul / M / Stock 15
   - Negro / M / Stock 8
7. Mostrar los **SKUs generados** automáticamente
8. Clic en **"Guardar"**
9. Ver el producto en el catálogo

---

## ESCENA 6 — Ventas y Pedidos
**⏱ Duración: 4:00 minutos**

### Texto para Narrar:
> *"El corazón del sistema son los Pedidos. Aquí gestionamos todo el ciclo de ventas.*
>
> *Un pedido pasa por varios estados: primero comienza como Borrador mientras lo estamos preparando. Al pagar el anticipo mínimo del 30%, pasa a Confirmado. Luego entra En Producción, después queda Listo para entrega, y finalmente se marca como Entregado cuando se cobra el saldo restante.*
>
> *Vamos a crear un pedido completo. Seleccionamos el cliente, la fecha de entrega...*
>
> *Ahora agregamos las líneas del pedido. Buscamos el producto, seleccionamos la variante —la talla y el color— y la cantidad. El precio se carga del catálogo automáticamente.*
>
> *Observen que el sistema calcula el total y el anticipo mínimo requerido. No podemos confirmar el pedido sin pagar al menos ese 30%.*
>
> *Registramos el anticipo. Seleccionamos el método de pago —en este caso usaremos Pago Móvil— ingresamos el monto y el número de referencia.*
>
> *¡El pedido pasa a estado Confirmado!"*

### Acciones en Pantalla:
1. Clic en **Pedidos** en el menú lateral
2. Mostrar la **lista de pedidos** con sus estados de colores
3. Clic en **"+ Nuevo Pedido"**
4. Seleccionar el cliente creado anteriormente
5. Seleccionar fecha de entrega (+15 días)
6. Agregar líneas:
   - Camisa Polo Azul/M → cantidad: 20
   - Camisa Polo Negro/M → cantidad: 10
7. Mostrar el **total calculado** y el **anticipo mínimo (30 %)**
8. Clic en **"Registrar Anticipo"**
9. Seleccionar "Pago Móvil"
10. Ingresar monto (30 % del total)
11. Ingresar referencia: "2024100500001"
12. Clic en **"Registrar"**
13. Mostrar el pedido en estado **"Confirmado"** (badge azul)
14. Mostrar el **QR del pedido** generado

---

## ESCENA 7 — Producción y QR
**⏱ Duración: 3:00 minutos**

### Texto para Narrar:
> *"Una vez confirmado el pedido, podemos generar las órdenes de producción.*
>
> *El módulo de Producción usa un tablero Kanban que nos permite visualizar en tiempo real el estado de todas las órdenes: pendientes, en proceso y completadas.*
>
> *Desde el detalle del pedido, generamos las órdenes de producción. El sistema propone los tipos necesarios: corte, impresión y confección. A cada orden le asignamos el trabajador responsable.*
>
> *Cada orden tiene un código QR único. El trabajador escanea el QR cuando comienza y cuando termina su trabajo, registrando automáticamente los tiempos de producción.*
>
> *Si mostramos el portal del trabajador, verán que es una interfaz simplificada que muestra solo las órdenes asignadas a esa persona."*

### Acciones en Pantalla:
1. Clic en **Producción** en el menú lateral
2. Mostrar el **tablero Kanban**
3. Volver al pedido anterior → clic en **"Generar Órdenes de Producción"**
4. Asignar trabajador a cada orden
5. Clic en **"Crear Órdenes"**
6. Volver al **tablero Kanban** → ver las nuevas tarjetas en "Pendiente"
7. Abrir una orden → mostrar el **código QR**
8. Clic en **"Imprimir QR"** (mostrar vista de impresión)
9. Cerrar la vista de impresión

---

## ESCENA 8 — Tesorería y Pagos
**⏱ Duración: 2:00 minutos**

### Texto para Narrar:
> *"El módulo de Tesorería gestiona todos los pagos del negocio.*
>
> *El sistema soporta todos los métodos de pago del mercado venezolano: Pago Móvil, Zelle, efectivo en dólares o bolívares, transferencias bancarias, Binance USDT, y también pagos con crédito del cliente.*
>
> *Cuando un cliente abona al saldo de su pedido, registramos el pago aquí. El sistema lleva el control del saldo pendiente por pedido y actualiza automáticamente el crédito disponible del cliente.*
>
> *Los montos en bolívares siempre se calculan usando la tasa BCV vigente del día."*

### Acciones en Pantalla:
1. Clic en **Tesorería** en el menú lateral
2. Mostrar la vista principal con el **resumen del día**
3. Clic en **"Nuevo Pago"**
4. Seleccionar el pedido anterior
5. Seleccionar método "Zelle"
6. Ingresar monto: "$150.00"
7. Ingresar referencia
8. Clic en **"Registrar Pago"**
9. Mostrar que el **saldo pendiente del pedido** se actualizó

---

## ESCENA 9 — Reportes y KPIs
**⏱ Duración: 2:30 minutos**

### Texto para Narrar:
> *"El módulo de Reportes nos da visibilidad completa del negocio.*
>
> *Tenemos 6 tipos de reportes disponibles: ventas por período, producción, clientes y créditos, inventario, nómina, y flujo de caja.*
>
> *Vamos a generar un reporte de ventas. Seleccionamos el tipo, definimos el rango de fechas y hacemos clic en 'Generar'.*
>
> *El resultado muestra los datos en una tabla y un gráfico visual. Todos los montos se muestran en dólares y en bolívares, usando la tasa BCV.*
>
> *Y con un solo clic podemos exportar todo a un archivo CSV para trabajarlo en Excel."*

### Acciones en Pantalla:
1. Clic en **Reportes** en el menú lateral
2. Mostrar los **6 tipos de reporte** disponibles
3. Seleccionar **"Ventas por Período"**
4. Seleccionar rango de fechas del mes actual
5. Clic en **"Generar Reporte"**
6. Mostrar la **tabla de resultados** (señalar columnas USD y Bs.)
7. Mostrar el **gráfico**
8. Clic en **"Exportar CSV"** → mostrar la descarga

---

## ESCENA 10 — Configuración de Empresa
**⏱ Duración: 2:00 minutos**

### Texto para Narrar:
> *"En el módulo de Configuración, personalizamos el sistema con los datos de nuestra empresa.*
>
> *Podemos ingresar el nombre de la empresa, el RIF, la dirección, el correo y los teléfonos. Esta información aparecerá en los encabezados de los reportes y documentos.*
>
> *También podemos cargar el logotipo de la empresa. La imagen aparecerá en la barra superior y en la pantalla de login.*
>
> *Y muy útil: podemos cambiar los colores del sistema y alternar entre tema oscuro y claro. El tema oscuro reduce la fatiga visual en jornadas largas de trabajo."*

### Acciones en Pantalla:
1. Clic en **Configuración** en el menú lateral
2. Mostrar el **formulario completo**
3. Llenar datos de la empresa:
   - Nombre: "Confecciones AbbySoft C.A."
   - RIF: "J-99887766-5"
   - Dirección: "Zona Industrial, Maracay, Aragua"
   - Email: "info@abbytextil.com.ve"
   - Teléfono: "0243-555-0010"
4. Clic en **"Seleccionar Imagen"** → seleccionar el logo
5. Mostrar la **vista previa del logo**
6. Mostrar el **selector de colores**
7. Hacer clic en el **toggle Dark/Light** para mostrar el cambio de tema
8. Volver al tema oscuro
9. Clic en **"Guardar Configuración"**
10. Mostrar el logo actualizado en la barra superior

---

## ESCENA 11 — Portal del Trabajador
**⏱ Duración: 1:30 minutos**

### Texto para Narrar:
> *"Finalmente, veamos el portal del trabajador. Este es el acceso que usarán los operarios en el taller.*
>
> *El portal muestra solo las órdenes de producción asignadas a ese trabajador. La interfaz es simple y clara, pensada para usarse en tabletas.*
>
> *El trabajador puede ver el detalle de cada orden y escanear el código QR para registrar el inicio o la finalización de su trabajo.*
>
> *El sistema registra automáticamente el trabajador, la hora y la fecha de cada acción."*

### Acciones en Pantalla:
1. Abrir una pestaña nueva del navegador o modo incógnito
2. Navegar a `http://localhost:5173`
3. Ingresar con credenciales de un **trabajador**
4. Mostrar la **vista simplificada** del portal
5. Ver las órdenes asignadas
6. Abrir una orden → mostrar el botón de **"Escanear QR"**

---

## CIERRE — Despedida
**⏱ Duración: 30–45 segundos**

### Texto para Narrar:
> *"Eso es todo en este tutorial de AbbySoft Textil.*
>
> *Hemos recorrido todos los módulos del sistema: gestión de clientes, catálogo de prendas, creación de pedidos, producción con control QR, tesorería con todos los métodos de pago venezolanos, reportes en doble moneda y la configuración personalizada de la empresa.*
>
> *Si tienen dudas sobre alguna funcionalidad específica, consulten el manual de usuario incluido en la documentación del sistema.*
>
> *¡Gracias por usar AbbySoft Textil!"*

### Acciones en Pantalla:
1. Volver al **Dashboard principal**
2. Hacer un último recorrido lento por los widgets
3. Terminar mostrando el **logo de la empresa** en la barra superior

---

## Tips de Post-Producción

### Edición Básica con Software Gratuito

| Software | Uso | Descarga |
|---|---|---|
| **DaVinci Resolve** | Edición completa (gratuito) | https://blackmagicdesign.com |
| **CapCut** | Edición rápida con subtítulos automáticos | https://capcut.com |
| **Clipchamp** | Integrado en Windows 11 | Menú Inicio |

### Sugerencias de Edición

- **Intro**: Agregar el logo AbbySoft con animación de entrada (2–3 segundos)
- **Subtítulos**: Agregar subtítulos automáticos para accesibilidad
- **Capítulos**: Agregar marcadores para cada escena (útil en YouTube)
- **Música de fondo**: Vol. 10–15%, música corporativa instrumental
- **Transiciones**: Fundido (fade) de 0.5 segundos entre escenas
- **Zoom**: En momentos donde se muestren formularios, hacer zoom digital al 120% para mayor visibilidad
- **Anotaciones**: Agregar flechas o círculos sobre los elementos que se están explicando

### Estructura del Archivo Final

```
abbysoft_textil_tutorial_v1.mp4
Resolución: 1920×1080
Duración: ~22 minutos
Tamaño estimado: 800 MB – 1.2 GB
```

---

*Guión creado el 29 de octubre de 2026 · AbbySoft Textil v1.0*
