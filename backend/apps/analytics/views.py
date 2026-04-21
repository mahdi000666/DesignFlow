import os
import datetime

from django.db.models import Sum, Count, Q, Avg, F
from django.db.models.functions import TruncDate
from django.utils.dateparse import parse_date

from rest_framework.views import APIView
from rest_framework.response import Response
from groq import Groq

from apps.projects.models import Project
from apps.tasks.models import Task
from apps.timelog.models import TimeLog
from apps.feedback.models import Feedback
from apps.users.models import Designer, Client
from apps.users.permissions import IsManager


def _parse_filters(request):
    """Extract and parse shared query params."""
    out = {}
    raw_from = request.query_params.get('date_from')
    raw_to   = request.query_params.get('date_to')
    if raw_from:
        out['date_from'] = parse_date(raw_from)
    if raw_to:
        out['date_to'] = parse_date(raw_to)
    client_id  = request.query_params.get('client')
    project_id = request.query_params.get('project')
    if client_id:
        out['client_id'] = client_id
    if project_id:
        out['project_id'] = project_id
    return out


# ---------------------------------------------------------------------------
# KPI Summary
# ---------------------------------------------------------------------------

class KPISummaryView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        client_id = request.query_params.get('client')

        projects = Project.objects.all()
        if client_id:
            projects = projects.filter(client_id=client_id)

        total_revenue  = projects.aggregate(total=Sum('budget_amount'))['total'] or 0
        active_count   = projects.filter(status='Active').count()
        pending_fb     = Feedback.objects.filter(
            status='Pending',
            project__in=projects,
        ).count()

        # Average EHR across projects that have both budget_amount and logged hours
        ehr_projects = projects.filter(budget_amount__isnull=False).annotate(
            actual_hours=Sum('tasks__time_logs__hours_spent')
        ).filter(actual_hours__gt=0)

        ehrs = [
            float(p.budget_amount) / float(p.actual_hours)
            for p in ehr_projects
        ]
        avg_ehr = sum(ehrs) / len(ehrs) if ehrs else 0

        return Response({
            'total_revenue':    float(total_revenue),
            'avg_ehr':          round(avg_ehr, 2),
            'active_projects':  active_count,
            'pending_feedback': pending_fb,
        })


# ---------------------------------------------------------------------------
# Budget Variance — estimated vs actual hours per project
# ---------------------------------------------------------------------------

class BudgetVarianceView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        f = _parse_filters(request)

        projects = Project.objects.select_related('client__user').all()
        if f.get('client_id'):
            projects = projects.filter(client_id=f['client_id'])
        if f.get('project_id'):
            projects = projects.filter(id=f['project_id'])

        data = []
        for project in projects:
            task_qs = Task.objects.filter(project=project)

            timelog_filter = {}
            if f.get('date_from'):
                timelog_filter['time_logs__created_at__date__gte'] = f['date_from']
            if f.get('date_to'):
                timelog_filter['time_logs__created_at__date__lte'] = f['date_to']

            if timelog_filter:
                task_qs = task_qs.filter(**timelog_filter)

            agg = task_qs.aggregate(
                total_estimated=Sum('estimated_hours'),
                total_actual=Sum('time_logs__hours_spent'),
            )
            estimated = float(agg['total_estimated'] or 0)
            actual    = float(agg['total_actual'] or 0)
            variance_pct = (
                (actual - estimated) / estimated * 100 if estimated > 0 else None
            )

            data.append({
                'project_id':    project.id,
                'project_name':  project.project_name,
                'budget_hours':  float(project.budget_hours or 0),
                'estimated_hours': estimated,
                'actual_hours':  actual,
                'variance_pct':  round(variance_pct, 1) if variance_pct is not None else None,
            })

        return Response(data)


# ---------------------------------------------------------------------------
# Effective Hourly Rate — budget_amount / SUM(hours_spent)
# ---------------------------------------------------------------------------

class EHRView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        client_id  = request.query_params.get('client')
        project_id = request.query_params.get('project')

        projects = Project.objects.filter(budget_amount__isnull=False).select_related('client__user')
        if client_id:
            projects = projects.filter(client_id=client_id)
        if project_id:
            projects = projects.filter(id=project_id)

        data = []
        for project in projects:
            actual_hours = project.tasks.aggregate(
                total=Sum('time_logs__hours_spent')
            )['total']
            actual_hours_f = float(actual_hours or 0)
            ehr = (
                float(project.budget_amount) / actual_hours_f
                if actual_hours_f > 0 else None
            )
            data.append({
                'project_id':   project.id,
                'project_name': project.project_name,
                'budget_amount': float(project.budget_amount),
                'actual_hours': actual_hours_f,
                'ehr':          round(ehr, 2) if ehr is not None else None,
            })

        return Response(data)


# ---------------------------------------------------------------------------
# Client Profitability Ranking
# ---------------------------------------------------------------------------

class ClientProfitabilityView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        clients = Client.objects.select_related('user').annotate(
            total_revenue=Sum('projects__budget_amount'),
            total_hours=Sum('projects__tasks__time_logs__hours_spent'),
            revision_count=Count(
                'projects__feedback',
                filter=Q(projects__feedback__category='Revision'),
            ),
        ).order_by(F('total_revenue').desc(nulls_last=True))

        data = []
        for c in clients:
            revenue = float(c.total_revenue or 0)
            hours   = float(c.total_hours or 0)
            ehr     = revenue / hours if hours > 0 else None
            data.append({
                'client_id':      c.id,
                'client_name':    c.user.full_name,
                'total_revenue':  revenue,
                'total_hours':    hours,
                'ehr':            round(ehr, 2) if ehr is not None else None,
                'revision_count': c.revision_count or 0,
            })

        return Response(data)


# ---------------------------------------------------------------------------
# Scope Creep Index — unplanned / total tasks * 100
# ---------------------------------------------------------------------------

class ScopeCreepView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        f = _parse_filters(request)

        projects = Project.objects.all()
        if f.get('client_id'):
            projects = projects.filter(client_id=f['client_id'])
        if f.get('project_id'):
            projects = projects.filter(id=f['project_id'])

        data = []
        for project in projects:
            agg = Task.objects.filter(project=project).aggregate(
                total=Count('id'),
                unplanned=Count('id', filter=Q(is_unplanned=True)),
            )
            total     = agg['total'] or 0
            unplanned = agg['unplanned'] or 0
            index     = (unplanned / total * 100) if total > 0 else 0
            data.append({
                'project_id':        project.id,
                'project_name':      project.project_name,
                'total_tasks':       total,
                'unplanned_tasks':   unplanned,
                'scope_creep_index': round(index, 1),
            })

        return Response(data)


# ---------------------------------------------------------------------------
# Designer Utilisation — SUM(hours_spent) / available_hours_per_week * 100
# ---------------------------------------------------------------------------

class DesignerUtilizationView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        f = _parse_filters(request)

        timelogs = TimeLog.objects.all()
        if f.get('date_from'):
            timelogs = timelogs.filter(created_at__date__gte=f['date_from'])
        if f.get('date_to'):
            timelogs = timelogs.filter(created_at__date__lte=f['date_to'])

        designers = Designer.objects.select_related('user').all()

        data = []
        for designer in designers:
            logged = float(
                timelogs.filter(designer=designer).aggregate(
                    total=Sum('hours_spent')
                )['total'] or 0
            )
            avail       = designer.available_hours_per_week
            utilization = (logged / avail * 100) if avail and avail > 0 else None
            data.append({
                'designer_id':            designer.id,
                'designer_name':          designer.user.full_name,
                'logged_hours':           logged,
                'available_hours_per_week': avail,
                'utilization_pct':        round(utilization, 1) if utilization is not None else None,
            })

        return Response(data)


# ---------------------------------------------------------------------------
# Cumulative Hours Over Time — for line chart (requires project param)
# ---------------------------------------------------------------------------

class CumulativeHoursView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        f = _parse_filters(request)
        project_id = f.get('project_id')
        if not project_id:
            return Response({'error': 'project param is required'}, status=400)

        timelogs = TimeLog.objects.filter(task__project_id=project_id)
        if f.get('date_from'):
            timelogs = timelogs.filter(created_at__date__gte=f['date_from'])
        if f.get('date_to'):
            timelogs = timelogs.filter(created_at__date__lte=f['date_to'])

        daily = (
            timelogs
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(hours=Sum('hours_spent'))
            .order_by('date')
        )

        cumulative = []
        running = 0.0
        for row in daily:
            running += float(row['hours'])
            cumulative.append({
                'date':             str(row['date']),
                'cumulative_hours': round(running, 2),
            })

        return Response(cumulative)


# ---------------------------------------------------------------------------
# Revenue by Client — for pie chart
# ---------------------------------------------------------------------------

class RevenueByClientView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        clients = Client.objects.select_related('user').annotate(
            total_revenue=Sum('projects__budget_amount')
        ).filter(total_revenue__gt=0).order_by('-total_revenue')

        data = [
            {
                'client_name':   c.user.full_name,
                'total_revenue': float(c.total_revenue),
            }
            for c in clients
        ]
        return Response(data)


# ---------------------------------------------------------------------------
# Profit Margin — EHR vs weighted avg designer hourly_rate
# ---------------------------------------------------------------------------

class ProfitMarginView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        f = _parse_filters(request)

        projects = Project.objects.filter(budget_amount__isnull=False)
        if f.get('project_id'):
            projects = projects.filter(id=f['project_id'])
        if f.get('client_id'):
            projects = projects.filter(client_id=f['client_id'])

        data = []
        for project in projects:
            actual_hours = project.tasks.aggregate(
                total=Sum('time_logs__hours_spent')
            )['total']
            if not actual_hours or actual_hours == 0:
                continue

            ehr = float(project.budget_amount) / float(actual_hours)

            avg_rate = project.assignments.aggregate(
                avg=Avg('designer__hourly_rate')
            )['avg']
            avg_rate_f = float(avg_rate) if avg_rate is not None else None
            margin = (
                (ehr - avg_rate_f) / ehr * 100
                if avg_rate_f is not None else None
            )

            data.append({
                'project_id':          project.id,
                'project_name':        project.project_name,
                'ehr':                 round(ehr, 2),
                'avg_designer_rate':   round(avg_rate_f, 2) if avg_rate_f is not None else None,
                'profit_margin_pct':   round(margin, 1) if margin is not None else None,
            })

        return Response(data)


# ---------------------------------------------------------------------------
# AI Project Health Narrative — Groq / llama-3.3-70b-versatile
# ---------------------------------------------------------------------------

class AISummaryView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project param is required'}, status=400)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        # --- Gather metrics ---
        task_agg = Task.objects.filter(project=project).aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='Completed')),
            unplanned=Count('id', filter=Q(is_unplanned=True)),
            actual=Sum('time_logs__hours_spent'),
        )

        total_tasks     = task_agg['total'] or 0
        completed_tasks = task_agg['completed'] or 0
        unplanned       = task_agg['unplanned'] or 0
        actual_hours    = float(task_agg['actual'] or 0)
        budget_hours    = float(project.budget_hours or 0)

        budget_util     = actual_hours / budget_hours * 100 if budget_hours > 0 else None
        scope_creep     = unplanned / total_tasks * 100 if total_tasks > 0 else 0
        task_completion = completed_tasks / total_tasks * 100 if total_tasks > 0 else 0

        ehr = (
            float(project.budget_amount) / actual_hours
            if actual_hours > 0 and project.budget_amount
            else None
        )

        fb_agg = Feedback.objects.filter(project=project).aggregate(
            revisions=Count('id', filter=Q(category='Revision')),
            approvals=Count('id', filter=Q(category='Approval')),
        )
        revisions = fb_agg['revisions'] or 0
        approvals = fb_agg['approvals'] or 0

        days_remaining = (
            (project.deadline - datetime.date.today()).days
            if project.deadline else None
        )

        # --- Build prompt ---
        prompt = (
            f"You are a project health analyst for a design agency. "
            f"Write a 3–4 sentence plain-English health summary for this project. "
            f"Flag the single biggest risk and suggest one concrete action for the manager. "
            f"Be direct — synthesise the numbers into insight rather than repeating them verbatim.\n\n"
            f"Project: {project.project_name}\n"
            f"Budget utilisation: {f'{budget_util:.0f}%' if budget_util is not None else 'unknown'}\n"
            f"Task completion: {task_completion:.0f}%\n"
            f"Scope creep index: {scope_creep:.0f}%\n"
            f"Revision-to-approval ratio: {revisions}:{approvals}\n"
            f"Effective Hourly Rate: {f'{ehr:.2f}' if ehr else 'N/A'}\n"
            f"Days until deadline: {days_remaining if days_remaining is not None else 'no deadline set'}"
        )
        
        groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
        response = groq_client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=300,
        )
        summary = response.choices[0].message.content.strip()

        try:
            groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
            response = groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=[{'role': 'user', 'content': prompt}],
                max_tokens=300,
            )
            summary = response.choices[0].message.content.strip()
        except Exception as e:
            return Response({'error': f'AI summary unavailable: {e}'}, status=502)

        return Response({'summary': summary})