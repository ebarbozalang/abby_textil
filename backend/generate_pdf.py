import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

# Paleta oficial AbbySoft
COLOR_PRIMARY = colors.HexColor("#7B0078")       # Morado AbbySoft
COLOR_PRIMARY_LIGHT = colors.HexColor("#F3E8F3") # Fondo suave morado
COLOR_SECONDARY = colors.HexColor("#1F2937")     # Texto oscuro
COLOR_MUTED = colors.HexColor("#6B7280")         # Texto secundario
COLOR_BORDER = colors.HexColor("#E5E7EB")        # Bordes
COLOR_ALERT_BG = colors.HexColor("#FEF3C7")      # Fondo ámbar de advertencia
COLOR_ALERT_BORDER = colors.HexColor("#F59E0B")  # Borde ámbar
COLOR_SUCCESS_BG = colors.HexColor("#D1FAE5")    # Fondo verde
COLOR_SUCCESS_BORDER = colors.HexColor("#10B981")# Borde verde

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Portada: no dibuja encabezado ni pie de página
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_MUTED)

        # Encabezado
        self.drawString(54, 11 * inch - 36, "AbbySoft Textil — Manual de Usuario Oficial (Venezuela)")
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Pie de página
        self.line(54, 45, 8.5 * inch - 54, 45)
        self.drawString(54, 32, "Confidencial & Exclusivo — Sistema de Gestión y Trazabilidad Textil")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_str)

        self.restoreState()


def build_pdf(md_path, pdf_path):
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=COLOR_PRIMARY,
        alignment=1, # Centrado
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=COLOR_SECONDARY,
        alignment=1,
    )

    meta_style = ParagraphStyle(
        "CoverMeta",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=15,
        textColor=COLOR_MUTED,
        alignment=1,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=21,
        textColor=COLOR_PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=COLOR_SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    h3_style = ParagraphStyle(
        "Heading3_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=COLOR_PRIMARY,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=COLOR_SECONDARY,
        spaceBefore=3,
        spaceAfter=4,
    )

    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=COLOR_SECONDARY,
        leftIndent=15,
        spaceBefore=1,
        spaceAfter=2,
    )

    code_style = ParagraphStyle(
        "Code_Custom",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=COLOR_SECONDARY,
    )

    alert_style = ParagraphStyle(
        "Alert_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#78350F"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=COLOR_SECONDARY,
    )

    story = []

    # ==================== PORTADA ====================
    story.append(Spacer(1, 40))
    # Logo o distintivo visual
    logo_path = os.path.abspath(os.path.join(os.path.dirname(md_path), "frontend", "public", "logo.png"))
    if os.path.exists(logo_path):
        from reportlab.platypus import Image
        img = Image(logo_path, width=1.5*inch, height=1.5*inch)
        img.hAlign = 'CENTER'
        story.append(img)
        story.append(Spacer(1, 20))

    story.append(Paragraph("AbbySoft Textil", title_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Sistema de Gestión Textil bajo Pedido, Trazabilidad QR<br/>y Control Financiero Bimonetario", subtitle_style))
    story.append(Spacer(1, 25))
    story.append(HRFlowable(width="60%", thickness=2, color=COLOR_PRIMARY, spaceBefore=10, spaceAfter=20, hAlign='CENTER'))
    story.append(Spacer(1, 20))

    meta_text = """
    <b>MANUAL DE USUARIO OFICIAL</b><br/>
    <b>Versión:</b> 1.0 — Adaptación Integral Venezuela 🇻🇪<br/>
    <b>Moneda Base:</b> Dólar Estadounidense ($ USD) &nbsp;|&nbsp; <b>Moneda Secundaria:</b> Bolívares (Bs.)<br/>
    <b>Tasa de Referencia:</b> Banco Central de Venezuela (BCV)<br/>
    <b>Tecnología:</b> FastAPI + PostgreSQL + React + Vite + TailwindCSS<br/>
    <b>Fecha de Emisión:</b> Octubre 2026
    """
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 80))

    box_data = [[
        Paragraph(
            "<b>IMPORTANTE:</b> Este manual contiene los procedimientos operativos estándar "
            "para la recepción de pedidos, reglas de cobro de anticipos (30% mínimo), trazabilidad en "
            "corte, estampado y confección, nómina por producción y arqueo de caja diaria.",
            alert_style
        )
    ]]
    box_table = Table(box_data, colWidths=[7.0 * inch])
    box_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ALERT_BG),
        ('BOX', (0, 0), (-1, -1), 1, COLOR_ALERT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(box_table)

    story.append(PageBreak())

    # ==================== PARSEO DEL CONTENIDO ====================
    lines = md_text.splitlines()
    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []

    def flush_table():
        nonlocal table_rows, in_table
        if not table_rows:
            in_table = False
            return
        
        # Determinar número de columnas
        max_cols = max(len(r) for r in table_rows)
        # Anchos proporcionales
        col_width = (7.0 * inch) / max_cols
        
        formatted_table_data = []
        for row_idx, row in enumerate(table_rows):
            formatted_row = []
            for cell in row:
                if row_idx == 0:
                    formatted_row.append(Paragraph(cell, table_header_style))
                else:
                    formatted_row.append(Paragraph(cell, table_cell_style))
            # Rellenar columnas vacías si falta alguna
            while len(formatted_row) < max_cols:
                formatted_row.append(Paragraph("", table_cell_style))
            formatted_table_data.append(formatted_row)

        t = Table(formatted_table_data, colWidths=[col_width] * max_cols)
        t_style = [
            ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]
        # Filas alternas
        for r_i in range(1, len(formatted_table_data)):
            if r_i % 2 == 0:
                t_style.append(('BACKGROUND', (0, r_i), (-1, r_i), colors.HexColor("#F9FAFB")))
        t.setStyle(TableStyle(t_style))
        story.append(Spacer(1, 4))
        story.append(t)
        story.append(Spacer(1, 6))
        table_rows = []
        in_table = False

    def flush_code():
        nonlocal code_lines, in_code_block
        if not code_lines:
            in_code_block = False
            return
        code_text = "<br/>".join([c.replace(" ", "&nbsp;").replace("<", "&lt;").replace(">", "&gt;") for c in code_lines])
        code_box = Table([[Paragraph(code_text, code_style)]], colWidths=[7.0 * inch])
        code_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#1F2937")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#374151")),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        # Cambiar color de texto en código a blanco
        white_code_style = ParagraphStyle("WhiteCode", parent=code_style, textColor=colors.HexColor("#F3F4F6"))
        code_box = Table([[Paragraph(code_text, white_code_style)]], colWidths=[7.0 * inch])
        code_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#1F2937")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#374151")),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(Spacer(1, 4))
        story.append(code_box)
        story.append(Spacer(1, 6))
        code_lines = []
        in_code_block = False

    skip_header = True
    for line in lines:
        raw = line.strip()

        # Omitir portada del md inicial hasta la tabla de contenidos
        if raw.startswith("## 📑 Tabla de Contenidos"):
            skip_header = False

        if skip_header:
            continue

        # Bloques de código
        if raw.startswith("```"):
            if in_code_block:
                flush_code()
            else:
                if in_table:
                    flush_table()
                in_code_block = True
                code_lines = []
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        # Tablas markdown
        if raw.startswith("|") and raw.endswith("|"):
            cells = [c.strip() for c in raw.split("|")[1:-1]]
            # Verificar si es fila separadora (|---|---|)
            if all(set(c).issubset({'-', ':', ' '}) for c in cells):
                continue
            if not in_table:
                in_table = True
                table_rows = []
            table_rows.append(cells)
            continue
        elif in_table:
            flush_table()

        # Separadores horizontales
        if raw in ("---", "***", "___"):
            story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_BORDER, spaceBefore=8, spaceAfter=8))
            continue

        # Encabezados
        if raw.startswith("# "):
            clean = raw[2:].strip()
            story.append(Paragraph(clean, title_style))
            story.append(Spacer(1, 6))
            continue

        if raw.startswith("## "):
            clean = raw[3:].strip()
            # Salto de página antes de cada sección principal (excepto tabla de contenidos)
            if not clean.startswith("📑"):
                story.append(Spacer(1, 10))
            story.append(Paragraph(clean, h1_style))
            continue

        if raw.startswith("### "):
            clean = raw[4:].strip()
            story.append(Paragraph(clean, h2_style))
            continue

        if raw.startswith("#### "):
            clean = raw[5:].strip()
            story.append(Paragraph(clean, h3_style))
            continue

        # Citas de alerta (> [!NOTE], > [!TIP], > Texto)
        if raw.startswith(">"):
            alert_content = raw.lstrip("> ").strip()
            if alert_content.startswith("[!"):
                continue
            alert_p = Paragraph(f"<b>NOTA:</b> {alert_content}", alert_style)
            alert_box = Table([[alert_p]], colWidths=[7.0 * inch])
            alert_box.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), COLOR_PRIMARY_LIGHT),
                ('BOX', (0, 0), (-1, -1), 1, COLOR_PRIMARY),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(Spacer(1, 4))
            story.append(alert_box)
            story.append(Spacer(1, 4))
            continue

        # Viñetas
        if raw.startswith("* ") or raw.startswith("- "):
            bullet_text = "• " + raw[2:].strip()
            # Formato negrita simple
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
            bullet_text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', bullet_text)
            story.append(Paragraph(bullet_text, bullet_style))
            continue

        if re.match(r'^\d+\.\s', raw):
            num_text = raw
            num_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', num_text)
            num_text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', num_text)
            story.append(Paragraph(num_text, bullet_style))
            continue

        # Párrafos normales
        if raw:
            p_text = raw
            p_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', p_text)
            p_text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', p_text)
            story.append(Paragraph(p_text, body_style))
        else:
            story.append(Spacer(1, 3))

    if in_table:
        flush_table()
    if in_code_block:
        flush_code()

    # Generar documento con canvas numerado
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF generado exitosamente en: {pdf_path}")

if __name__ == "__main__":
    md_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "MANUAL_DE_USUARIO.md"))
    pdf_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "MANUAL_DE_USUARIO.pdf"))
    build_pdf(md_file, pdf_file)
