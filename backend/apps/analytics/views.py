import datetime
import os
from datetime import timedelta

from django.db.models import F, Avg, Count, Q, DurationField, ExpressionWrapper, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from groq import Groq
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.feedback.models import Feedback
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.timelog.models import TimeLog
from apps.users.models import Client, Designer
from apps.users.permissions import IsManager
from .services import (
    EHR_MIN_HOURS,
    actual_ehr,
    budget_utilization,
    budget_variance_pct,
    client_profitability_metrics,
    estimate_variance_pct,
    feedback_revision_summary,
    logged_hours,
    project_profit_metrics,
    project_task_counts,
    rounded,
    scope_creep_pct,
    target_ehr,
)


def _parse_filters(request):
    filters = {}
    raw_from = request.query_params.get('date_from')
    raw_to = request.query_params.get('date_to')
    if raw_from:
        filters['date_from'] = parse_date(raw_from)
    if raw_to:
        filters['date_to'] = parse_date(raw_to)

    client_id = request.query_params.get('client')
    project_id = request.query_params.get('project')
    if client_id:
        filters['client_id'] = client_id
    if project_id:
        filters['project_id'] = project_id
    return filters


def _apply_project_filters(queryset, filters, include_created_at=False):
    if filters.get('client_id'):
        queryset = queryset.filter(client_id=filters['client_id'])
    if filters.get('project_id'):
        queryset = queryset.filter(id=filters['project_id'])
    if include_created_at and filters.get('date_from'):
        queryset = queryset.filter(created_at__date__gte=filters['date_from'])
    if include_created_at and filters.get('date_to'):
        queryset = queryset.filter(created_at__date__lte=filters['date_to'])
    return queryset


def _apply_timelog_filters(queryset, filters):
    if filters.get('client_id'):
        queryset = queryset.filter(task__project__client_id=filters['client_id'])
    if filters.get('project_id'):
        queryset = queryset.filter(task__project_id=filters['project_id'])
    if filters.get('date_from'):
        queryset = queryset.filter(created_at__date__gte=filters['date_from'])
    if filters.get('date_to'):
        queryset = queryset.filter(created_at__date__lte=filters['date_to'])
    return queryset


def _apply_feedback_filters(queryset, filters):
    if filters.get('client_id'):
        queryset = queryset.filter(project__client_id=filters['client_id'])
    if filters.get('project_id'):
        queryset = queryset.filter(project_id=filters['project_id'])
    if filters.get('date_from'):
        queryset = queryset.filter(submitted_at__date__gte=filters['date_from'])
    if filters.get('date_to'):
        queryset = queryset.filter(submitted_at__date__lte=filters['date_to'])
    return queryset


def _project_log_hours(project, filters):
    return logged_hours(_apply_timelog_filters(
        TimeLog.objects.filter(task__project=project),
        filters,
    ))


class KPISummaryView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        projects = _apply_project_filters(Project.objects.all(), filters, include_created_at=True)

        total_revenue = float(projects.aggregate(total=Sum('budget_amount'))['total'] or 0)
        active_count = projects.filter(status='Active').count()
        pending_feedback = _apply_feedback_filters(
            Feedback.objects.filter(
                status__in=['Pending', 'InProgress'],
                project__in=projects,
            ).exclude(category='Approval'),
            filters,
        ).count()

        total_budget = 0.0
        total_hours = 0.0
        for project in projects.filter(budget_amount__isnull=False):
            actual = _project_log_hours(project, filters)
            if actual >= EHR_MIN_HOURS:
                total_budget += float(project.budget_amount)
                total_hours += actual
        avg_ehr = total_budget / total_hours if total_hours > 0 else 0

        return Response({
            'total_revenue': total_revenue,
            'avg_ehr': round(avg_ehr, 2),
            'active_projects': active_count,
            'pending_feedback': pending_feedback,
        })


class BudgetVarianceView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        projects = _apply_project_filters(
            Project.objects.select_related('client__user').all(),
            filters,
        )

        data = []
        for project in projects:
            task_qs = Task.objects.filter(project=project)
            log_qs = _apply_timelog_filters(
                TimeLog.objects.filter(task__project=project),
                filters,
            )

            if filters.get('date_from') or filters.get('date_to'):
                task_ids = log_qs.values_list('task_id', flat=True).distinct()
                task_qs = task_qs.filter(id__in=task_ids)

            estimated = float(task_qs.aggregate(total=Sum('estimated_hours'))['total'] or 0)
            actual = logged_hours(log_qs)
            budget_hours = float(project.budget_hours or 0)

            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'budget_hours': budget_hours,
                'estimated_hours': estimated,
                'actual_hours': actual,
                'budget_variance_pct': rounded(budget_variance_pct(actual, budget_hours), 1),
                'estimate_variance_pct': rounded(estimate_variance_pct(actual, estimated), 1),
            })

        return Response(data)


class EHRView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        projects = _apply_project_filters(
            Project.objects.filter(budget_amount__isnull=False).select_related('client__user'),
            filters,
        )

        data = []
        for project in projects:
            actual_hours = _project_log_hours(project, filters)
            ehr = actual_ehr(project, actual_hours)
            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'budget_amount': float(project.budget_amount),
                'actual_hours': actual_hours,
                'ehr': rounded(ehr, 2),
                'ehr_reliable': actual_hours >= EHR_MIN_HOURS,
            })

        return Response(data)


class ClientProfitabilityView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        clients = Client.objects.select_related('user').all()
        if filters.get('client_id'):
            clients = clients.filter(id=filters['client_id'])

        data = []
        for client in clients:
            all_projects = Project.objects.filter(client=client)
            log_qs = _apply_timelog_filters(
                TimeLog.objects.filter(task__project__in=all_projects),
                filters,
            )

            if filters.get('date_from') or filters.get('date_to'):
                active_project_ids = log_qs.values_list('task__project_id', flat=True).distinct()
                revenue_projects = all_projects.filter(id__in=active_project_ids)
            else:
                revenue_projects = all_projects

            metrics = client_profitability_metrics(revenue_projects, log_qs)
            revision_summary = feedback_revision_summary(
                list(revenue_projects),
                _apply_feedback_filters(
                    Feedback.objects.filter(project__in=revenue_projects),
                    filters,
                ),
            )
            approval_count = _apply_feedback_filters(
                Feedback.objects.filter(project__in=revenue_projects, category='Approval'),
                filters,
            ).count()

            data.append({
                'client_id': client.id,
                'client_name': client.user.full_name,
                'project_count': revenue_projects.count(),
                'total_revenue': metrics.total_revenue,
                'total_hours': round(metrics.total_hours, 2),
                'ehr': rounded(metrics.ehr, 2),
                'avg_designer_rate': rounded(metrics.avg_designer_rate, 2),
                'profit_margin_pct': rounded(metrics.profit_margin_pct, 1),
                'revision_count': revision_summary['revision_count'],
                'approval_count': approval_count,
                'included_revision_limit': revision_summary['included_revision_limit'],
                'excess_revision_count': revision_summary['excess_revision_count'],
            })

        data.sort(
            key=lambda row: (
                row['profit_margin_pct'] is None,
                -(row['profit_margin_pct'] or 0),
                row['ehr'] is None,
                -(row['ehr'] or 0),
                -row['total_revenue'],
            )
        )
        return Response(data)


class ScopeCreepView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        projects = _apply_project_filters(Project.objects.all(), filters)

        data = []
        for project in projects:
            task_qs = Task.objects.filter(project=project)
            if filters.get('date_from'):
                task_qs = task_qs.filter(created_at__date__gte=filters['date_from'])
            if filters.get('date_to'):
                task_qs = task_qs.filter(created_at__date__lte=filters['date_to'])

            agg = task_qs.aggregate(
                total=Count('id'),
                unplanned=Count('id', filter=Q(is_unplanned=True)),
            )
            total = agg['total'] or 0
            unplanned = agg['unplanned'] or 0

            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'total_tasks': total,
                'unplanned_tasks': unplanned,
                'scope_creep_index': rounded(scope_creep_pct(total, unplanned), 1),
            })

        return Response(data)


class DesignerUtilizationView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        if not filters.get('date_from') and not filters.get('date_to'):
            today = timezone.now().date()
            filters['date_from'] = today - timedelta(days=today.weekday())
            filters['date_to'] = filters['date_from'] + timedelta(days=6)

        timelogs = _apply_timelog_filters(TimeLog.objects.all(), filters)
        designers = Designer.objects.select_related('user').all()

        data = []
        for designer in designers:
            designer_hours = logged_hours(timelogs.filter(designer=designer))
            available = designer.available_hours_per_week
            utilization = (designer_hours / available * 100) if available and available > 0 else None

            data.append({
                'designer_id': designer.id,
                'designer_user_id': designer.user.id,
                'designer_name': designer.user.full_name,
                'logged_hours': designer_hours,
                'available_hours_per_week': available,
                'utilization_pct': rounded(utilization, 1),
            })

        return Response(data)


class CumulativeHoursView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        project_id = filters.get('project_id')
        if not project_id:
            return Response({'error': 'project param is required'}, status=400)

        timelogs = _apply_timelog_filters(
            TimeLog.objects.filter(task__project_id=project_id),
            filters,
        )

        daily = (
            timelogs.annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(hours=Sum('hours_spent'))
            .order_by('date')
        )

        cumulative = []
        running = 0.0
        for row in daily:
            running += float(row['hours'])
            cumulative.append({
                'date': str(row['date']),
                'cumulative_hours': round(running, 2),
            })

        return Response(cumulative)


class RevenueByClientView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        projects = _apply_project_filters(
            Project.objects.select_related('client__user').all(),
            filters,
            include_created_at=True,
        )

        data = []
        for client in Client.objects.select_related('user').all():
            client_projects = projects.filter(client=client)
            total_revenue = client_projects.aggregate(total=Sum('budget_amount'))['total']
            if total_revenue and total_revenue > 0:
                data.append({
                    'client_name': client.user.full_name,
                    'total_revenue': float(total_revenue),
                })

        data.sort(key=lambda row: row['total_revenue'], reverse=True)
        return Response(data)


class ProfitMarginView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        projects = _apply_project_filters(
            Project.objects.filter(budget_amount__isnull=False),
            filters,
        )

        data = []
        for project in projects:
            log_qs = _apply_timelog_filters(
                TimeLog.objects.filter(task__project=project),
                filters,
            )
            metrics = project_profit_metrics(project, log_qs)
            if metrics['actual_hours'] < EHR_MIN_HOURS:
                continue

            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'status': project.status,
                'budget_amount': metrics['budget_amount'],
                'budget_hours': metrics['budget_hours'],
                'ehr': rounded(metrics['ehr'], 2),
                'actual_hours': rounded(metrics['actual_hours'], 2),
                'avg_designer_rate': rounded(metrics['avg_designer_rate'], 2),
                'profit_margin_pct': rounded(metrics['profit_margin_pct'], 1),
                'target_ehr': rounded(metrics['target_ehr'], 2),
                'margin_at_budget': rounded(metrics['margin_at_budget'], 1),
                'projected_margin': rounded(metrics['projected_margin'], 1),
                'projected_ehr': rounded(metrics['projected_ehr'], 2),
            })

        return Response(data)


class AISummaryView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        filters = _parse_filters(request)
        project_id = filters.get('project_id')
        if not project_id:
            return Response({'error': 'project param is required'}, status=400)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=404)

        counts = project_task_counts(project)
        actual_hours = logged_hours(TimeLog.objects.filter(task__project=project))
        budget_util = budget_utilization(project, actual_hours)
        task_completion = (
            counts['completed_tasks'] / counts['total_tasks'] * 100
            if counts['total_tasks'] > 0
            else 0
        )
        scope_creep = scope_creep_pct(counts['total_tasks'], counts['unplanned_tasks'])
        target_rate = target_ehr(project)
        ehr = actual_ehr(project, actual_hours)
        ehr_str = (
            f'{ehr:.2f} TND/h'
            if ehr is not None
            else f'insufficient data ({actual_hours:.1f}h logged, minimum {EHR_MIN_HOURS}h required)'
        )

        feedback_agg = Feedback.objects.filter(project=project).aggregate(
            revisions=Count('id', filter=Q(category='Revision')),
            approvals=Count('id', filter=Q(category='Approval')),
        )
        revisions = feedback_agg['revisions'] or 0
        approvals = feedback_agg['approvals'] or 0
        excess_revisions = max(0, revisions - int(project.revision_limit or 0))
        days_remaining = (
            (project.deadline - datetime.date.today()).days
            if project.deadline else None
        )

        prompt = (
            'You are a project health analyst for a Tunisian design agency. '
            'Write a 3-4 sentence plain-English health summary for this project. '
            'Flag the single biggest risk and suggest one concrete action for the manager.\n\n'
            'CRITICAL CONTEXT: For Active or On-Hold projects, the Effective Hourly Rate '
            '(EHR) is calculated as budget_amount divided by actual_hours_logged_so_far. '
            'Because actual_hours is only partial for incomplete projects, the EHR will '
            'always appear very high early on and will naturally decrease toward the target. '
            'DO NOT flag a high EHR as a cost overrun for incomplete projects. '
            'Extra revisions should be treated as billable contract overages, not as an '
            'automatic profitability penalty. Focus on revision overage, scope creep, '
            'deadline risk, and whether budget utilisation is outpacing task completion.\n\n'
            f'Project: {project.project_name}\n'
            f'Status: {project.status}\n'
            f'Budget utilisation: {f"{budget_util:.0f}%" if budget_util is not None else "unknown"}\n'
            f'Task completion: {task_completion:.0f}%\n'
            f'Scope creep index: {scope_creep:.0f}%\n'
            f'Revision usage: {revisions}/{project.revision_limit} included revisions '
            f'({excess_revisions} billable overage)\n'
            f'Revision-to-approval ratio: {revisions}:{approvals}\n'
            f'Effective Hourly Rate: {ehr_str}\n'
            f'Target Hourly Rate: {f"{target_rate:.2f} TND/h" if target_rate is not None else "N/A"}\n'
            f'Days until deadline: {days_remaining if days_remaining is not None else "no deadline set"}'
        )

        try:
            api_key = os.environ.get('GROQ_API_KEY')
            if not api_key:
                raise RuntimeError('GROQ_API_KEY is not configured')

            groq_client = Groq(api_key=api_key)
            response = groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=[{'role': 'user', 'content': prompt}],
                max_tokens=300,
            )
        except Exception as exc:
            return Response({'error': f'AI summary unavailable: {exc}'}, status=502)

        return Response({'summary': response.choices[0].message.content.strip()})
