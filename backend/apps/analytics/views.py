import datetime
import os
from datetime import timedelta

from django.db.models import Count, Q, Sum
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
    total = _apply_timelog_filters(
        TimeLog.objects.filter(task__project=project),
        filters,
    ).aggregate(total=Sum('hours_spent'))['total']
    return float(total or 0)


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

        ehrs = []
        for project in projects.filter(budget_amount__isnull=False):
            actual_hours = _project_log_hours(project, filters)
            if actual_hours > 0:
                ehrs.append(float(project.budget_amount) / actual_hours)

        avg_ehr = sum(ehrs) / len(ehrs) if ehrs else 0

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
            actual = float(log_qs.aggregate(total=Sum('hours_spent'))['total'] or 0)
            variance_pct = ((actual - estimated) / estimated * 100) if estimated > 0 else None

            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'budget_hours': float(project.budget_hours or 0),
                'estimated_hours': estimated,
                'actual_hours': actual,
                'variance_pct': round(variance_pct, 1) if variance_pct is not None else None,
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
            ehr = (float(project.budget_amount) / actual_hours) if actual_hours > 0 else None
            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'budget_amount': float(project.budget_amount),
                'actual_hours': actual_hours,
                'ehr': round(ehr, 2) if ehr is not None else None,
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
            projects = _apply_project_filters(
                Project.objects.filter(client=client),
                filters,
                include_created_at=True,
            )
            total_revenue = float(projects.aggregate(total=Sum('budget_amount'))['total'] or 0)
            total_hours = float(
                _apply_timelog_filters(
                    TimeLog.objects.filter(task__project__in=projects),
                    filters,
                ).aggregate(total=Sum('hours_spent'))['total'] or 0
            )
            revision_count = _apply_feedback_filters(
                Feedback.objects.filter(project__in=projects, category='Revision'),
                filters,
            ).count()
            ehr = total_revenue / total_hours if total_hours > 0 else None
            weighted_ehr = (ehr / (1 + revision_count)) if ehr is not None else None

            data.append({
                'client_id': client.id,
                'client_name': client.user.full_name,
                'total_revenue': total_revenue,
                'total_hours': total_hours,
                'ehr': round(ehr, 2) if ehr is not None else None,
                'weighted_ehr': round(weighted_ehr, 2) if weighted_ehr is not None else None,
                'revision_count': revision_count,
            })

        data.sort(
            key=lambda row: (
                row['weighted_ehr'] is None,
                -(row['weighted_ehr'] or 0),
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
            scope_creep_index = (unplanned / total * 100) if total > 0 else 0

            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'total_tasks': total,
                'unplanned_tasks': unplanned,
                'scope_creep_index': round(scope_creep_index, 1),
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
            logged_hours = float(
                timelogs.filter(designer=designer).aggregate(
                    total=Sum('hours_spent')
                )['total'] or 0
            )
            available = designer.available_hours_per_week
            utilization = (logged_hours / available * 100) if available and available > 0 else None

            data.append({
                'designer_id': designer.id,
                'designer_user_id': designer.user.id,
                'designer_name': designer.user.full_name,
                'logged_hours': logged_hours,
                'available_hours_per_week': available,
                'utilization_pct': round(utilization, 1) if utilization is not None else None,
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
            actual_hours = float(log_qs.aggregate(total=Sum('hours_spent'))['total'] or 0)
            if actual_hours == 0:
                continue

            ehr = float(project.budget_amount) / actual_hours

            weighted_total = 0.0
            rated_hours = 0.0
            for row in log_qs.values('designer__hourly_rate').annotate(
                logged_hours=Sum('hours_spent')
            ):
                hourly_rate = row['designer__hourly_rate']
                logged_hours = float(row['logged_hours'] or 0)
                if hourly_rate is None:
                    continue
                weighted_total += float(hourly_rate) * logged_hours
                rated_hours += logged_hours

            weighted_rate = (
                weighted_total / actual_hours
                if actual_hours > 0 and rated_hours >= actual_hours
                else None
            )
            margin = (
                (ehr - weighted_rate) / ehr * 100
                if weighted_rate is not None else None
            )

            data.append({
                'project_id': project.id,
                'project_name': project.project_name,
                'ehr': round(ehr, 2),
                'actual_hours':      round(actual_hours, 2),
                'avg_designer_rate': round(weighted_rate, 2) if weighted_rate is not None else None,
                'profit_margin_pct': round(margin, 1) if margin is not None else None,
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

        task_agg = Task.objects.filter(project=project).aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='Completed')),
            unplanned=Count('id', filter=Q(is_unplanned=True)),
            actual=Sum('time_logs__hours_spent'),
        )

        total_tasks = task_agg['total'] or 0
        completed_tasks = task_agg['completed'] or 0
        unplanned = task_agg['unplanned'] or 0
        actual_hours = float(task_agg['actual'] or 0)
        budget_hours = float(project.budget_hours or 0)

        budget_utilization = (actual_hours / budget_hours * 100) if budget_hours > 0 else None
        task_completion = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        scope_creep = (unplanned / total_tasks * 100) if total_tasks > 0 else 0
        ehr = (
            float(project.budget_amount) / actual_hours
            if actual_hours > 0 and project.budget_amount
            else None
        )
        target_rate = (
            float(project.budget_amount) / budget_hours
            if budget_hours > 0 and project.budget_amount
            else None
        )

        feedback_agg = Feedback.objects.filter(project=project).aggregate(
            revisions=Count('id', filter=Q(category='Revision')),
            approvals=Count('id', filter=Q(category='Approval')),
        )
        revisions = feedback_agg['revisions'] or 0
        approvals = feedback_agg['approvals'] or 0
        days_remaining = (
            (project.deadline - datetime.date.today()).days
            if project.deadline else None
        )

        prompt = (
            'You are a project health analyst for a tunisian design agency. '
            'Write a 3-4 sentence plain-English health summary for this project. '
            'Flag the single biggest risk and suggest one concrete action for the manager.\n\n'
            f'Project: {project.project_name}\n'
            f'Budget utilisation: {f"{budget_utilization:.0f}%" if budget_utilization is not None else "unknown"}\n'
            f'Task completion: {task_completion:.0f}%\n'
            f'Scope creep index: {scope_creep:.0f}%\n'
            f'Revision-to-approval ratio: {revisions}:{approvals}\n'
            f'Effective Hourly Rate: {f"{ehr:.2f}" if ehr is not None else "N/A"}\n'
            f'Target Hourly Rate: {f"{target_rate:.2f}" if target_rate is not None else "N/A"}\n'
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
