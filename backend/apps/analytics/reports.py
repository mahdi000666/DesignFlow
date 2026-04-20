"""
Report generators for PDF (ReportLab) and Excel (openpyxl) exports.
Both functions return a seeked BytesIO buffer ready to stream as an HTTP response.
"""

import io

from django.db.models import Sum, Count, Q, Avg

from apps.projects.models import Project
from apps.tasks.models import Task
from apps.users.models import Client
from apps.feedback.models import Feedback


# ---------------------------------------------------------------------------
# PDF — project profitability summary
# ---------------------------------------------------------------------------

def generate_project_pdf(project_id: int) -> io.BytesIO:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    project = Project.objects.select_related('client__user').get(id=project_id)

    task_agg = Task.objects.filter(project=project).aggregate(
        estimated=Sum('estimated_hours'),
        actual=Sum('time_logs__hours_spent'),
        total=Count('id'),
        unplanned=Count('id', filter=Q(is_unplanned=True)),
    )

    actual_hours   = float(task_agg['actual'] or 0)
    estimated_h    = float(task_agg['estimated'] or 0)
    budget_hours   = float(project.budget_hours or 0)
    budget_amount  = float(project.budget_amount or 0)
    ehr            = budget_amount / actual_hours if actual_hours > 0 else 0
    budget_util    = actual_hours / budget_hours * 100 if budget_hours > 0 else 0
    scope_creep    = (
        task_agg['unplanned'] / task_agg['total'] * 100
        if task_agg['total'] else 0
    )

    fb_agg = Feedback.objects.filter(project=project).aggregate(
        revisions=Count('id', filter=Q(category='Revision')),
        approvals=Count('id', filter=Q(category='Approval')),
    )

    # Avg designer rate
    avg_rate = project.assignments.aggregate(avg=Avg('designer__hourly_rate'))['avg']
    margin   = (
        (ehr - float(avg_rate)) / ehr * 100
        if avg_rate and ehr > 0 else None
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=40, leftMargin=40, topMargin=50, bottomMargin=40,
    )
    styles   = getSampleStyleSheet()
    elements = []

    BLUE  = colors.HexColor('#1e40af')
    LIGHT = colors.HexColor('#f1f5f9')

    elements.append(Paragraph(f'Project Report: {project.project_name}', styles['Title']))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f'Client: {project.client.user.full_name}', styles['Normal']))
    elements.append(Paragraph(f'Status: {project.status}', styles['Normal']))
    if project.deadline:
        elements.append(Paragraph(f'Deadline: {project.deadline}', styles['Normal']))
    elements.append(Spacer(1, 16))

    rows = [
        ['Metric', 'Value'],
        ['Budget Amount',        f'{budget_amount:,.2f}'],
        ['Budget Hours',         f'{budget_hours:.1f} h'],
        ['Actual Hours Logged',  f'{actual_hours:.1f} h'],
        ['Estimated Hours',      f'{estimated_h:.1f} h'],
        ['Budget Utilisation',   f'{budget_util:.1f}%'],
        ['Effective Hourly Rate', f'{ehr:.2f}'],
        ['Scope Creep Index',    f'{scope_creep:.1f}%'],
        ['Revisions',            str(fb_agg['revisions'] or 0)],
        ['Approvals',            str(fb_agg['approvals'] or 0)],
    ]
    if margin is not None:
        rows.append(['Profit Margin', f'{margin:.1f}%'])

    table = Table(rows, colWidths=[230, 200])
    table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0),  (-1, 0),  BLUE),
        ('TEXTCOLOR',     (0, 0),  (-1, 0),  colors.white),
        ('FONTNAME',      (0, 0),  (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0),  (-1, -1), 10),
        ('ROWBACKGROUNDS',(0, 1),  (-1, -1), [colors.white, LIGHT]),
        ('GRID',          (0, 0),  (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('LEFTPADDING',   (0, 0),  (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0),  (-1, -1), 10),
        ('TOPPADDING',    (0, 0),  (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0),  (-1, -1), 7),
    ]))
    elements.append(table)

    doc.build(elements)
    buf.seek(0)
    return buf


# ---------------------------------------------------------------------------
# Excel — client profitability + budget data (all projects or one)
# ---------------------------------------------------------------------------

def generate_excel(project_id: int | None = None) -> io.BytesIO:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    wb = openpyxl.Workbook()

    BLUE_FILL = PatternFill(start_color='1E40AF', end_color='1E40AF', fill_type='solid')
    HDR_FONT  = Font(bold=True, color='FFFFFF')
    CENTER    = Alignment(horizontal='center')

    def write_headers(ws, headers):
        for col, h in enumerate(headers, 1):
            c = ws.cell(row=1, column=col, value=h)
            c.fill = BLUE_FILL
            c.font = HDR_FONT
            c.alignment = CENTER
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = 20

    # --- Sheet 1: Client Profitability ---
    ws1 = wb.active
    ws1.title = 'Client Profitability'
    write_headers(ws1, ['Client', 'Total Revenue', 'Total Hours', 'EHR', 'Revisions'])

    clients = Client.objects.select_related('user').annotate(
        total_revenue=Sum('projects__budget_amount'),
        total_hours=Sum('projects__tasks__time_logs__hours_spent'),
        revision_count=Count(
            'projects__feedback',
            filter=Q(projects__feedback__category='Revision'),
        ),
    ).order_by('-total_revenue')

    for row, c in enumerate(clients, 2):
        revenue = float(c.total_revenue or 0)
        hours   = float(c.total_hours or 0)
        ehr     = round(revenue / hours, 2) if hours > 0 else ''
        ws1.append([c.user.full_name, revenue, hours, ehr, c.revision_count or 0])

    # --- Sheet 2: Budget Data ---
    ws2 = wb.create_sheet('Budget Data')
    write_headers(ws2, [
        'Project', 'Client', 'Status',
        'Budget Hours', 'Actual Hours', 'Estimated Hours', 'Variance %',
        'Budget Amount', 'EHR', 'Scope Creep %',
    ])

    projects = Project.objects.select_related('client__user').all()
    if project_id:
        projects = projects.filter(id=project_id)

    for row, p in enumerate(projects, 2):
        agg = Task.objects.filter(project=p).aggregate(
            estimated=Sum('estimated_hours'),
            actual=Sum('time_logs__hours_spent'),
            total=Count('id'),
            unplanned=Count('id', filter=Q(is_unplanned=True)),
        )
        actual    = float(agg['actual'] or 0)
        estimated = float(agg['estimated'] or 0)
        budget_h  = float(p.budget_hours or 0)
        budget_a  = float(p.budget_amount or 0)
        variance  = round((actual - estimated) / estimated * 100, 1) if estimated > 0 else ''
        ehr       = round(budget_a / actual, 2) if actual > 0 else ''
        total_t   = agg['total'] or 0
        scope     = round(agg['unplanned'] / total_t * 100, 1) if total_t > 0 else 0
        ws2.append([
            p.project_name,
            p.client.user.full_name,
            p.status,
            budget_h,
            actual,
            estimated,
            variance,
            budget_a,
            ehr,
            scope,
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf