# -*- coding: utf-8 -*-
"""
Grabador de Video Tutorial - AbbySoft Textil (100% Funcional y Sincronizado)
"""
import time
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:5173"
ADMIN_EMAIL = "admin@textilapp.com"
ADMIN_PASSWORD = "admin123"

PROYECTO = Path(__file__).resolve().parent.parent
VIDEO_DIR = PROYECTO / "docs" / "video"
CAPTURAS_DIR = PROYECTO / "docs" / "capturas"
VIDEO_DIR.mkdir(parents=True, exist_ok=True)
CAPTURAS_DIR.mkdir(parents=True, exist_ok=True)

def ir_a(page, ruta):
    page.goto(f"{BASE_URL}{ruta}", wait_until="commit")
    time.sleep(2)

def pausa(seg=1.5, msg=""):
    if msg:
        print(f"  [+] {msg}")
    time.sleep(seg)

def tomar_captura(page, nombre: str):
    ruta = str(CAPTURAS_DIR / f"{nombre}.png")
    page.screenshot(path=ruta, full_page=False)
    print(f"  [Screenshot] {nombre}.png")

def login(page):
    print("\nESCENA 2 - Inicio de Sesion")
    ir_a(page, "/login")
    pausa(1.5, "Pantalla de Login")
    tomar_captura(page, "01_pantalla_login")

    # Click en el botón de acceso rápido Admin para demostración fluida
    admin_btn = page.locator('button:has-text("Admin")').first
    if admin_btn.is_visible():
        admin_btn.click()
        time.sleep(1)
        tomar_captura(page, "02_login_credenciales")
        pausa(1, "Accediendo como Administrador...")
        ir_a(page, "/dashboard")
    else:
        email_inp = page.locator('input[type="email"]').first
        email_inp.fill(ADMIN_EMAIL)
        pwd_inp = page.locator('input[type="password"]').first
        pwd_inp.fill(ADMIN_PASSWORD)
        tomar_captura(page, "02_login_credenciales")
        page.locator('button[type="submit"]').first.click()
        time.sleep(2)
        ir_a(page, "/dashboard")

    pausa(2, "Login completado -> Dashboard Principal")
    tomar_captura(page, "03_dashboard")

def escena_dashboard(page):
    print("\nESCENA 3 - Dashboard y Tasa BCV")
    ir_a(page, "/dashboard")
    pausa(1.5, "Dashboard con KPIs")
    tomar_captura(page, "04_dashboard_kpis")

    page.evaluate("window.scrollTo({top: 350, behavior: 'smooth'})")
    pausa(1.5, "Visualizando graficos y actividad")
    tomar_captura(page, "05_dashboard_graficos")
    page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
    pausa(1)

    bcv = page.locator('text=/BCV|Tasa|Bs/i').first
    if bcv.is_visible():
        bcv.hover()
        pausa(1, "Widget Tasa BCV")
        tomar_captura(page, "06_tasa_bcv_widget")

def escena_clientes(page):
    print("\nESCENA 4 - Modulo Clientes")
    ir_a(page, "/clientes")
    pausa(1.5, "Lista de clientes")
    tomar_captura(page, "07_clientes_lista")

    search = page.locator('input[placeholder*="uscar"], input[placeholder*="iltrar"], input[type="search"]').first
    if search.is_visible():
        search.click()
        page.keyboard.type("Cliente", delay=50)
        pausa(1, "Busqueda de cliente")
        tomar_captura(page, "08_clientes_busqueda")
        search.fill("")
        pausa(0.5)

    nuevo_btn = page.locator('button:has-text("Nuevo"), button:has-text("Agregar"), a:has-text("Nuevo")').first
    if nuevo_btn.is_visible():
        nuevo_btn.click()
        time.sleep(1)
        pausa(1, "Formulario nuevo cliente")
        tomar_captura(page, "09_nuevo_cliente_form")

        ts = int(time.time())
        nombre = f"Textilera Caracas C.A. {ts % 1000}"

        for selector, valor in [
            ('input[name="nombre"], input[placeholder*="ombre"]', nombre),
            ('input[name="rif"], input[placeholder*="RIF"]', f"J-{ts % 99999999:08d}-9"),
            ('input[name="email"], input[type="email"]', f"compras{ts % 1000}@textilcaracas.com"),
            ('input[name="telefono"], input[placeholder*="eléfono"], input[placeholder*="elefono"]', "0412-555-1234"),
            ('input[name="direccion"], textarea[name="direccion"]', "Zona Industrial La Bandera, Caracas"),
            ('input[name="limite_credito"], input[placeholder*="rédito"]', "2500"),
        ]:
            inp = page.locator(selector).first
            if inp.is_visible():
                inp.click()
                page.keyboard.type(valor, delay=25)
                time.sleep(0.1)

        tomar_captura(page, "10_nuevo_cliente_lleno")
        pausa(1, "Guardando cliente...")
        submit_btn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first
        if submit_btn.is_visible():
            submit_btn.click()
            time.sleep(1.5)
        tomar_captura(page, "11_cliente_creado")

def escena_catalogo(page):
    print("\nESCENA 5 - Catalogo y Prendas")
    ir_a(page, "/catalogo")
    pausa(1.5, "Catalogo de productos")
    tomar_captura(page, "12_catalogo_lista")

    nuevo_btn = page.locator('button:has-text("Nuevo"), a:has-text("Nuevo")').first
    if nuevo_btn.is_visible():
        nuevo_btn.click()
        time.sleep(1)
        pausa(1, "Formulario nuevo producto")
        tomar_captura(page, "13_nuevo_producto_form")

        ts = int(time.time())
        for selector, valor in [
            ('input[name="nombre"], input[placeholder*="ombre"]', f"Camisa Oxford {ts % 1000}"),
            ('input[name="precio"], input[placeholder*="recio"]', "24.50"),
            ('input[name="costo"], input[placeholder*="osto"]', "11.00"),
        ]:
            inp = page.locator(selector).first
            if inp.is_visible():
                inp.click()
                page.keyboard.type(valor, delay=25)
                time.sleep(0.1)

        cat = page.locator('select[name="categoria"], select').first
        if cat.is_visible():
            cat.select_option(index=1)
            time.sleep(0.3)

        tomar_captura(page, "14_producto_datos")
        submit_btn = page.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Crear")').first
        if submit_btn.is_visible():
            submit_btn.click()
            time.sleep(1.5)
        tomar_captura(page, "15_producto_creado")

def escena_pedidos(page):
    print("\nESCENA 6 - Ventas y Pedidos")
    ir_a(page, "/pedidos")
    pausa(1.5, "Lista de pedidos con estados de produccion")
    tomar_captura(page, "16_pedidos_lista")

    nuevo_btn = page.locator('button:has-text("Nuevo"), a:has-text("Nuevo")').first
    if nuevo_btn.is_visible():
        nuevo_btn.click()
        time.sleep(1)
        pausa(1, "Formulario nuevo pedido")
        tomar_captura(page, "17_nuevo_pedido_form")

        cliente_sel = page.locator('select[name="cliente_id"], select[name="cliente"]').first
        if cliente_sel.is_visible():
            cliente_sel.select_option(index=1)
            time.sleep(0.5)

        tomar_captura(page, "18_pedido_cliente_seleccionado")

def escena_produccion(page):
    print("\nESCENA 7 - Produccion y QR")
    ir_a(page, "/produccion")
    pausa(1.5, "Tablero Kanban de produccion textil")
    tomar_captura(page, "19_produccion_kanban")

    page.evaluate("window.scrollTo({top: 200, behavior: 'smooth'})")
    pausa(1.5)
    tomar_captura(page, "20_produccion_ordenes")
    page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")

def escena_tesoreria(page):
    print("\nESCENA 8 - Tesoreria y Pagos")
    ir_a(page, "/tesoreria")
    pausa(1.5, "Modulo de Tesoreria")
    tomar_captura(page, "21_tesoreria_principal")

    nuevo_btn = page.locator('button:has-text("Nuevo"), button:has-text("Pago"), a:has-text("Nuevo")').first
    if nuevo_btn.is_visible():
        nuevo_btn.click()
        time.sleep(0.8)
        pausa(1, "Formulario de nuevo pago (Pago Movil, Zelle, Bs/USD)")
        tomar_captura(page, "22_nuevo_pago_form")

        metodo = page.locator('select[name="metodo_pago"], select[name="metodo"]').first
        if metodo.is_visible():
            try:
                metodo.select_option(index=1)
            except:
                pass
            time.sleep(0.5)
        tomar_captura(page, "23_pago_metodo_seleccionado")

        esc = page.locator('button:has-text("Cancelar"), button[aria-label="close"], button:has-text("×")').first
        if esc.is_visible():
            esc.click()

def escena_reportes(page):
    print("\nESCENA 9 - Reportes y KPIs")
    ir_a(page, "/reportes")
    pausa(1.5, "Modulo de Reportes")
    tomar_captura(page, "24_reportes_tipos")

    ventas = page.locator('button:has-text("Ventas"), div:has-text("Ventas por"):not(:has(*))').first
    if ventas.is_visible():
        ventas.click()
        time.sleep(0.5)

    generar = page.locator('button:has-text("Generar"), button:has-text("Ver")').first
    if generar.is_visible():
        generar.click()
        time.sleep(1.5)
        pausa(1.5, "Reporte generado")
        tomar_captura(page, "25_reporte_ventas")

    csv_btn = page.locator('button:has-text("CSV"), button:has-text("Exportar"), a:has-text("CSV")').first
    if csv_btn.is_visible():
        csv_btn.hover()
        pausa(1, "Exportar a CSV")
        tomar_captura(page, "26_exportar_csv")

def escena_configuracion(page):
    print("\nESCENA 10 - Configuracion de Empresa")
    ir_a(page, "/configuracion")
    pausa(1.5, "Modulo de Configuracion")
    tomar_captura(page, "27_configuracion_form")

    for selector, valor in [
        ('input[name="nombre_empresa"], input[placeholder*="mpresa"]', "AbbySoft Textil C.A."),
        ('input[name="rif"], input[placeholder*="RIF"]', "J-40123456-7"),
        ('input[name="direccion"], textarea[name="direccion"]', "Zona Industrial San Vicente, Maracay, Aragua"),
        ('input[name="email"], input[type="email"]', "info@abbytextil.com.ve"),
        ('input[name="telefono"], input[placeholder*="eléfono"], input[placeholder*="elefono"]', "0243-555-0010"),
    ]:
        inp = page.locator(selector).first
        if inp.is_visible():
            inp.click()
            inp.fill("")
            page.keyboard.type(valor, delay=20)
            time.sleep(0.1)

    tomar_captura(page, "28_configuracion_llena")

    theme = page.locator(
        'button:has-text("Oscuro"), button:has-text("Dark"), '
        'button:has-text("Claro"), input[type="checkbox"]'
    ).first
    if theme.is_visible():
        theme.click()
        pausa(1, "Cambiando tema a Claro")
        tomar_captura(page, "29_tema_claro")
        theme.click()
        pausa(1, "Regresando a Tema Oscuro")
        tomar_captura(page, "30_tema_oscuro")

    guardar = page.locator('button:has-text("Guardar"), button[type="submit"]').first
    if guardar.is_visible():
        guardar.click()
        time.sleep(1)
        pausa(1, "Configuracion guardada")
        tomar_captura(page, "31_configuracion_guardada")

def escena_cierre(page):
    print("\nESCENA CIERRE - Dashboard final")
    ir_a(page, "/dashboard")
    pausa(2, "Vista final del Dashboard")
    tomar_captura(page, "32_dashboard_final")

def main():
    print("=" * 60)
    print("  AbbySoft Textil - Grabador de Video Tutorial")
    print("=" * 60)
    print(f"  Frontend: {BASE_URL}")
    print(f"  Video:    {VIDEO_DIR}")
    print(f"  Capturas: {CAPTURAS_DIR}")
    print("=" * 60)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            slow_mo=120,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )

        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=str(VIDEO_DIR),
            record_video_size={"width": 1920, "height": 1080},
        )

        page = context.new_page()

        try:
            login(page)
            escena_dashboard(page)
            escena_clientes(page)
            escena_catalogo(page)
            escena_pedidos(page)
            escena_produccion(page)
            escena_tesoreria(page)
            escena_reportes(page)
            escena_configuracion(page)
            escena_cierre(page)
            pausa(1, "Finalizando grabacion...")
        except Exception as e:
            print(f"\n[ERROR] Grabacion interrumpida: {e}")
            page.screenshot(path=str(CAPTURAS_DIR / "ERROR_captura.png"))
            raise
        finally:
            context.close()
            browser.close()

    videos = list(VIDEO_DIR.glob("*.webm"))
    if videos:
        video_path = max(videos, key=lambda p: p.stat().st_mtime)
        video_final = VIDEO_DIR / "tutorial_abbysoft_textil.webm"
        if video_path != video_final:
            if video_final.exists():
                video_final.unlink()
            video_path.rename(video_final)
        size_mb = video_final.stat().st_size / (1024 * 1024)
        print(f"\n[OK] Video tutorial grabado: {video_final}")
        print(f"     Tamano: {size_mb:.2f} MB")

    capturas = list(CAPTURAS_DIR.glob("*.png"))
    print(f"\n[OK] {len(capturas)} capturas de pantalla guardadas en: {CAPTURAS_DIR}")
    print("\nTutorial completado con exito!")

if __name__ == "__main__":
    main()
