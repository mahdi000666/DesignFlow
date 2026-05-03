"""
Report generators for PDF (ReportLab) and Excel (openpyxl) exports.
Both functions return a seeked BytesIO buffer ready to stream as an HTTP response.
"""

import datetime
import io

from django.db.models import Avg, Count, Q, Sum

from apps.projects.models import Project
from apps.tasks.models import Task
from apps.users.models import Client
from apps.feedback.models import Feedback
from apps.timelog.models import TimeLog


# ─────────────────────────────────────────────────────────────────────────────
# PDF — project profitability summary
# ─────────────────────────────────────────────────────────────────────────────

def generate_project_pdf(project_id: int) -> io.BytesIO:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import (
        BaseDocTemplate, PageTemplate, Frame,
        Table, TableStyle, Paragraph, Spacer,
        HRFlowable, KeepTogether,
    )
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT

    # ── Data ──────────────────────────────────────────────────────────────────
    project = Project.objects.select_related('client__user').get(id=project_id)

    task_agg = Task.objects.filter(project=project).aggregate(
        estimated=Sum('estimated_hours'),
        actual=Sum('time_logs__hours_spent'),
        total=Count('id'),
        completed=Count('id', filter=Q(status='Completed')),
        unplanned=Count('id', filter=Q(is_unplanned=True)),
    )

    actual_hours    = float(task_agg['actual']    or 0)
    estimated_h     = float(task_agg['estimated'] or 0)
    budget_hours    = float(project.budget_hours  or 0)
    budget_amount   = float(project.budget_amount or 0)
    total_tasks     = task_agg['total']     or 0
    completed_tasks = task_agg['completed'] or 0
    unplanned_tasks = task_agg['unplanned'] or 0

    ehr          = budget_amount / actual_hours if actual_hours > 0 else 0
    budget_util  = actual_hours / budget_hours * 100 if budget_hours > 0 else 0
    scope_creep  = unplanned_tasks / total_tasks * 100 if total_tasks > 0 else 0
    task_done_pct = completed_tasks / total_tasks * 100 if total_tasks > 0 else 0

    fb_agg = Feedback.objects.filter(project=project).aggregate(
        revisions=Count('id', filter=Q(category='Revision')),
        approvals=Count('id', filter=Q(category='Approval')),
    )
    revisions = fb_agg['revisions'] or 0
    approvals  = fb_agg['approvals'] or 0

    avg_rate_raw = project.assignments.aggregate(avg=Avg('designer__hourly_rate'))['avg']
    margin = (
        (ehr - float(avg_rate_raw)) / ehr * 100
        if avg_rate_raw and ehr > 0 else None
    )

    # ── Palette ───────────────────────────────────────────────────────────────
    C_PRIMARY    = colors.HexColor('#6366f1')
    C_DARK       = colors.HexColor('#0e0d28')
    C_SLATE_900  = colors.HexColor('#0f172a')
    C_SLATE_700  = colors.HexColor('#334155')
    C_SLATE_600  = colors.HexColor('#475569')
    C_SLATE_400  = colors.HexColor('#94a3b8')
    C_SLATE_200  = colors.HexColor('#e2e8f0')
    C_SLATE_100  = colors.HexColor('#f1f5f9')
    C_SLATE_50   = colors.HexColor('#f8fafc')
    C_SUCCESS    = colors.HexColor('#10b981')
    C_WARNING    = colors.HexColor('#f59e0b')
    C_DANGER     = colors.HexColor('#ef4444')
    C_WHITE      = colors.white

    W, H      = A4          # 595.27 x 841.89 pt
    MX        = 40          # horizontal margin
    HEADER_H  = 60
    FOOTER_H  = 36
    CONTENT_W = W - 2 * MX

    generated = datetime.date.today().strftime('%d %b %Y')

    # ── Helper: colour-coded value ────────────────────────────────────────────
    def traffic(value: float, warn: float, danger: float, invert=False) -> colors.Color:
        """Return a colour given warn/danger thresholds. invert=True: lower is worse."""
        if invert:
            return C_DANGER if value < danger else (C_WARNING if value < warn else C_SUCCESS)
        return C_DANGER if value >= danger else (C_WARNING if value >= warn else C_PRIMARY)

    # ── Page template (header + footer drawn directly on canvas) ─────────────
    def on_page(canvas, doc):
        canvas.saveState()

        # Dark header band
        canvas.setFillColor(C_DARK)
        canvas.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)

        # Left accent stripe
        canvas.setFillColor(C_PRIMARY)
        canvas.rect(0, H - HEADER_H, 5, HEADER_H, fill=1, stroke=0)

        # Agency name
        canvas.setFillColor(C_WHITE)
        canvas.setFont('Helvetica-Bold', 15)
        canvas.drawString(MX + 8, H - HEADER_H + 35, 'DesignFlow')

        # "PROJECT REPORT" sub-label
        canvas.setFillColor(C_SLATE_400)
        canvas.setFont('Helvetica', 8)
        canvas.drawString(MX + 8, H - HEADER_H + 18, 'PROJECT REPORT')

        # Page number (header, right-aligned)
        canvas.setFillColor(C_SLATE_400)
        canvas.setFont('Helvetica', 8)
        canvas.drawRightString(W - MX, H - HEADER_H + 26, f'Page {doc.page}')

        # Footer rule
        canvas.setStrokeColor(C_SLATE_200)
        canvas.setLineWidth(0.5)
        canvas.line(MX, FOOTER_H, W - MX, FOOTER_H)

        # Footer text
        canvas.setFillColor(C_SLATE_400)
        canvas.setFont('Helvetica', 7.5)
        canvas.drawString(MX, FOOTER_H - 13, f'Generated on {generated}  ·  DesignFlow')

        canvas.restoreState()

    buf  = io.BytesIO()
    frame = Frame(
        MX, FOOTER_H + 6,
        CONTENT_W,
        H - HEADER_H - FOOTER_H - 22,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    doc = BaseDocTemplate(
        buf, pagesize=A4,
        pageTemplates=[PageTemplate(id='main', frames=[frame], onPage=on_page)],
    )

    # ── Paragraph styles ──────────────────────────────────────────────────────
    def ps(name, font='Helvetica', size=9, color=C_SLATE_700,
           bold=False, leading=None, space_before=0, space_after=0, align=TA_LEFT):
        return ParagraphStyle(
            name,
            fontName='Helvetica-Bold' if bold else font,
            fontSize=size,
            textColor=color,
            leading=leading or size * 1.4,
            spaceBefore=space_before,
            spaceAfter=space_after,
            alignment=align,
        )

    S_TITLE   = ps('title',  size=20, bold=True, color=C_SLATE_900, space_after=4)
    S_META    = ps('meta',   size=9,  color=C_SLATE_400, space_after=0)
    S_H2      = ps('h2',     size=10, bold=True, color=C_SLATE_700, space_before=4, space_after=6)
    S_TBL_LBL = ps('tlbl',  size=9,  color=C_SLATE_600)
    S_TBL_VAL = ps('tval',  size=9,  bold=True, color=C_SLATE_900)
    S_KPI_LBL = ps('klbl',  size=7,  color=C_SLATE_400, space_after=3)

    elements: list = []
    elements.append(Spacer(1, 8))

    # ── Project title & meta strip ────────────────────────────────────────────
    elements.append(Paragraph(project.project_name, S_TITLE))

    meta_parts = [project.client.user.full_name, project.status]
    if project.deadline:
        meta_parts.append(f'Due {project.deadline}')
    if project.category:
        meta_parts.append(project.category)
    elements.append(Paragraph('   ·   '.join(meta_parts), S_META))
    elements.append(Spacer(1, 14))
    elements.append(HRFlowable(width='100%', thickness=1, color=C_SLATE_200, spaceAfter=14))

    # ── KPI strip (4 tiles in one table row) ──────────────────────────────────
    util_col  = traffic(budget_util,  warn=80, danger=100)
    scope_col = traffic(scope_creep,  warn=15, danger=30)
    ehr_col   = traffic(ehr, warn=0, danger=0, invert=True) if ehr > 0 else C_SLATE_400

    def kpi_cell(label: str, value: str, val_color=C_SLATE_900):
        return [
            Paragraph(label, ps(f'kl_{label}', size=7, color=C_SLATE_400, space_after=4)),
            Paragraph(value, ps(f'kv_{label}', size=16, bold=True, color=val_color)),
        ]

    kpi_col_w = (CONTENT_W - 3) / 4
    kpi_table = Table(
        [[
            kpi_cell('BUDGET UTILISATION', f'{budget_util:.0f}%',    util_col),
            kpi_cell('ACTUAL HOURS',       f'{actual_hours:.1f} h',  C_SLATE_900),
            kpi_cell('EFF. HOURLY RATE',   f'TND {ehr:.2f}' if ehr else '—', ehr_col),
            kpi_cell('SCOPE CREEP',        f'{scope_creep:.0f}%',    scope_col),
        ]],
        colWidths=[kpi_col_w] * 4,
    )
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), C_SLATE_50),
        ('BOX',           (0, 0), (-1, -1), 1,   C_SLATE_200),
        ('LINEBEFORE',    (1, 0), (-1, -1), 1,   C_SLATE_200),
        ('LEFTPADDING',   (0, 0), (-1, -1), 14),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 14),
        ('TOPPADDING',    (0, 0), (-1, -1), 13),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 13),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 22))

    # ── Metrics table (full width) ────────────────────────────────────────────
    elements.append(Paragraph('Metrics', S_H2))

    metrics = [
        ('Budget Amount',         f'TND {budget_amount:,.2f}' if budget_amount else '—'),
        ('Budget Hours',          f'{budget_hours:.1f} h'     if budget_hours  else '—'),
        ('Actual Hours Logged',   f'{actual_hours:.1f} h'),
        ('Estimated Hours',       f'{estimated_h:.1f} h'      if estimated_h   else '—'),
        ('Effective Hourly Rate', f'TND {ehr:.2f}'            if ehr           else '—'),
        ('Budget Utilisation',    f'{budget_util:.1f}%'),
        ('Scope Creep Index',     f'{scope_creep:.1f}%'),
        ('Revisions',             str(revisions)),
        ('Approvals',             str(approvals)),
        ('Rev : Approval Ratio',  f'{revisions} : {approvals}'),
    ]
    if margin is not None:
        metrics.append(('Profit Margin', f'{margin:.1f}%'))

    LBL_W = CONTENT_W * 0.50
    VAL_W = CONTENT_W - LBL_W

    metric_rows = [
        [Paragraph(lbl, S_TBL_LBL), Paragraph(val, S_TBL_VAL)]
        for lbl, val in metrics
    ]
    metrics_tbl = Table(metric_rows, colWidths=[LBL_W, VAL_W])
    row_bgs = [
        ('BACKGROUND', (0, i), (-1, i), C_WHITE if i % 2 == 0 else C_SLATE_50)
        for i in range(len(metric_rows))
    ]
    metrics_tbl.setStyle(TableStyle([
        *row_bgs,
        ('BOX',           (0, 0), (-1, -1), 1,   C_SLATE_200),
        ('LINEBELOW',     (0, 0), (-1, -2), 0.5, C_SLATE_100),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(metrics_tbl)
    elements.append(Spacer(1, 20))

    # ── Build ─────────────────────────────────────────────────────────────────
    doc.build(elements)
    buf.seek(0)
    return buf


# ─────────────────────────────────────────────────────────────────────────────
# Excel — client profitability + budget data (all projects or one)
# ─────────────────────────────────────────────────────────────────────────────

def generate_excel(project_id: int | None = None) -> io.BytesIO:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, GradientFill
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()

    # ── Style constants ───────────────────────────────────────────────────────
    INDIGO_FILL  = PatternFill(start_color='6366F1', end_color='6366F1', fill_type='solid')
    ALT_FILL     = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')
    HDR_FONT     = Font(bold=True, color='FFFFFF', name='Calibri', size=10)
    BODY_FONT    = Font(name='Calibri', size=10)
    BOLD_FONT    = Font(bold=True, name='Calibri', size=10)
    CENTER       = Alignment(horizontal='center', vertical='center')
    LEFT         = Alignment(horizontal='left',   vertical='center')
    RIGHT        = Alignment(horizontal='right',  vertical='center')
    THIN         = Side(style='thin', color='E2E8F0')
    BORDER       = Border(bottom=THIN)

    def style_header(ws, headers: list[str]):
        ws.row_dimensions[1].height = 28
        for col, h in enumerate(headers, 1):
            c = ws.cell(row=1, column=col, value=h)
            c.fill      = INDIGO_FILL
            c.font      = HDR_FONT
            c.alignment = CENTER

    def style_row(ws, row_idx: int, n_cols: int, alternate: bool):
        for col in range(1, n_cols + 1):
            c = ws.cell(row=row_idx, column=col)
            if alternate:
                c.fill = ALT_FILL
            c.font      = BODY_FONT
            c.alignment = LEFT
            c.border    = BORDER
        ws.row_dimensions[row_idx].height = 20

    def right_cell(ws, row, col, value):
        c = ws.cell(row=row, column=col, value=value)
        c.alignment = RIGHT
        c.font = BOLD_FONT

    def autofit(ws, min_w=12, max_w=40):
        for col_cells in ws.columns:
            length = max(
                len(str(cell.value or ''))
                for cell in col_cells
            )
            ws.column_dimensions[col_cells[0].column_letter].width = min(max(length + 3, min_w), max_w)

    def freeze(ws):
        ws.freeze_panes = 'A2'

    # ── Sheet 1: Client Profitability ─────────────────────────────────────────
    ws1 = wb.active
    ws1.title = 'Client Profitability'
    headers1 = ['Client', 'Total Revenue (TND)', 'Total Hours', 'Eff. Hourly Rate', 'Revisions', 'Approvals']
    style_header(ws1, headers1)
    freeze(ws1)

    clients = Client.objects.select_related('user').all()

    # Compute ordering key separately so we can sort without annotate fan-out
    client_revenues = {
        row['client_id']: float(row['rev'] or 0)
        for row in Project.objects.values('client_id').annotate(rev=Sum('budget_amount'))
        }
    clients = sorted(clients, key=lambda c: client_revenues.get(c.id, 0), reverse=True)

    for i, c in enumerate(clients, 2):
        projects_qs = Project.objects.filter(client=c)
        revenue = float(projects_qs.aggregate(t=Sum('budget_amount'))['t'] or 0)
        hours   = float(
            TimeLog.objects.filter(task__project__in=projects_qs)
            .aggregate(t=Sum('hours_spent'))['t'] or 0
        )
        revisions = Feedback.objects.filter(project__in=projects_qs, category='Revision').count()
        approvals  = Feedback.objects.filter(project__in=projects_qs, category='Approval').count()
        ehr = round(revenue / hours, 2) if hours > 0 else None

        ws1.cell(row=i, column=1, value=c.user.full_name)
        right_cell(ws1, i, 2, round(revenue, 2))
        right_cell(ws1, i, 3, round(hours,   2))
        right_cell(ws1, i, 4, ehr or '—')
        right_cell(ws1, i, 5, revisions)
        right_cell(ws1, i, 6, approvals)
        style_row(ws1, i, len(headers1), i % 2 == 0)

    autofit(ws1)

    # ── Sheet 2: Budget Data ──────────────────────────────────────────────────
    ws2 = wb.create_sheet('Budget Data')
    headers2 = [
        'Project', 'Client', 'Status',
        'Budget Hours', 'Actual Hours', 'Estimated Hours', 'Variance %',
        'Budget Amount (TND)', 'Eff. Hourly Rate', 'Scope Creep %', 'Profit Margin %',
    ]
    style_header(ws2, headers2)
    freeze(ws2)

    projects = Project.objects.select_related('client__user').all()
    if project_id:
        projects = projects.filter(id=project_id)

    for i, p in enumerate(projects, 2):
        agg = Task.objects.filter(project=p).aggregate(
            estimated=Sum('estimated_hours'),
            actual=Sum('time_logs__hours_spent'),
            total=Count('id'),
            unplanned=Count('id', filter=Q(is_unplanned=True)),
        )
        actual    = float(agg['actual']    or 0)
        estimated = float(agg['estimated'] or 0)
        budget_h  = float(p.budget_hours   or 0)
        budget_a  = float(p.budget_amount  or 0)
        variance  = round((actual - estimated) / estimated * 100, 1) if estimated > 0 else None
        ehr_val   = round(budget_a / actual, 2) if actual > 0 else None
        total_t   = agg['total'] or 0
        scope     = round(agg['unplanned'] / total_t * 100, 1) if total_t > 0 else 0

        avg_rate_raw = p.assignments.aggregate(avg=Avg('designer__hourly_rate'))['avg']
        margin_val = (
            round((ehr_val - float(avg_rate_raw)) / ehr_val * 100, 1)
            if avg_rate_raw and ehr_val else None
        )

        row_data = [
            p.project_name, p.client.user.full_name, p.status,
            budget_h, actual, estimated,
            variance if variance is not None else '—',
            round(budget_a, 2),
            ehr_val if ehr_val is not None else '—',
            scope,
            margin_val if margin_val is not None else '—',
        ]
        for col, val in enumerate(row_data, 1):
            c = ws2.cell(row=i, column=col, value=val)
            c.alignment = RIGHT if col > 3 else LEFT
            c.font = BOLD_FONT if col > 3 else BODY_FONT

        style_row(ws2, i, len(headers2), i % 2 == 0)

    autofit(ws2)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf