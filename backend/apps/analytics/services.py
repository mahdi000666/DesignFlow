from dataclasses import dataclass

from django.db.models import Count, Q, Sum

from apps.feedback.models import Feedback
from apps.tasks.models import Task
from apps.timelog.models import TimeLog

EHR_MIN_HOURS = 10


def rounded(value, digits=2):
    return round(value, digits) if value is not None else None


def logged_hours(log_qs) -> float:
    return float(log_qs.aggregate(total=Sum('hours_spent'))['total'] or 0)


def weighted_designer_rate(log_qs, actual_hours: float | None = None) -> float | None:
    if actual_hours is None:
        actual_hours = logged_hours(log_qs)
    if actual_hours <= 0:
        return None

    weighted_total = 0.0
    rated_hours = 0.0
    for row in log_qs.values('designer__hourly_rate').annotate(logged_hours=Sum('hours_spent')):
        hourly_rate = row['designer__hourly_rate']
        hours = float(row['logged_hours'] or 0)
        if hourly_rate is None:
            continue
        weighted_total += float(hourly_rate) * hours
        rated_hours += hours

    if rated_hours <= 0:
        return None

    known_avg = weighted_total / rated_hours
    imputed = known_avg * (actual_hours - rated_hours)
    return (weighted_total + imputed) / actual_hours


def target_ehr(project) -> float | None:
    budget_hours = float(project.budget_hours or 0)
    if not project.budget_amount or budget_hours <= 0:
        return None
    return float(project.budget_amount) / budget_hours


def actual_ehr(project, actual_hours: float, require_reliable=True) -> float | None:
    if not project.budget_amount or actual_hours <= 0:
        return None
    if require_reliable and actual_hours < EHR_MIN_HOURS:
        return None
    return float(project.budget_amount) / actual_hours


def budget_utilization(project, actual_hours: float) -> float | None:
    budget_hours = float(project.budget_hours or 0)
    return (actual_hours / budget_hours * 100) if budget_hours > 0 else None


def estimate_variance_pct(actual_hours: float, estimated_hours: float) -> float | None:
    return ((actual_hours - estimated_hours) / estimated_hours * 100) if estimated_hours > 0 else None


def budget_variance_pct(actual_hours: float, budget_hours: float) -> float | None:
    return ((actual_hours - budget_hours) / budget_hours * 100) if budget_hours > 0 else None


def project_task_counts(project):
    task_qs = Task.objects.filter(project=project)
    agg = task_qs.aggregate(
        total=Count('id'),
        completed=Count('id', filter=Q(status='Completed')),
        unplanned=Count('id', filter=Q(is_unplanned=True)),
        estimated=Sum('estimated_hours'),
    )
    return {
        'total_tasks': agg['total'] or 0,
        'completed_tasks': agg['completed'] or 0,
        'unplanned_tasks': agg['unplanned'] or 0,
        'estimated_hours': float(agg['estimated'] or 0),
    }


def scope_creep_pct(total_tasks: int, unplanned_tasks: int) -> float:
    return (unplanned_tasks / total_tasks * 100) if total_tasks > 0 else 0


def project_profit_metrics(project, log_qs=None) -> dict:
    log_qs = log_qs if log_qs is not None else TimeLog.objects.filter(task__project=project)
    actual_hours = logged_hours(log_qs)
    budget_hours = float(project.budget_hours or 0)
    ehr = actual_ehr(project, actual_hours)
    rate = weighted_designer_rate(log_qs, actual_hours)
    target = target_ehr(project)

    margin = (
        (ehr - rate) / ehr * 100
        if ehr is not None and rate is not None
        else None
    )
    margin_at_budget = (
        (target - rate) / target * 100
        if target is not None and rate is not None
        else None
    )

    projected_ehr = None
    projected_margin = None
    if project.status != 'Completed' and actual_hours >= EHR_MIN_HOURS:
        counts = project_task_counts(project)
        total_tasks = counts['total_tasks']
        completed_tasks = counts['completed_tasks']
        if total_tasks > 0 and completed_tasks > 0 and project.budget_amount:
            completion_ratio = completed_tasks / total_tasks
            projected_hours = actual_hours / completion_ratio
            projected_ehr = float(project.budget_amount) / projected_hours
            projected_margin = (
                (projected_ehr - rate) / projected_ehr * 100
                if rate is not None
                else None
            )
        elif budget_hours > 0:
            projected_ehr = target
            projected_margin = margin_at_budget

    return {
        'budget_amount': float(project.budget_amount or 0),
        'budget_hours': budget_hours,
        'actual_hours': actual_hours,
        'ehr': ehr,
        'ehr_reliable': actual_hours >= EHR_MIN_HOURS,
        'avg_designer_rate': rate,
        'profit_margin_pct': margin,
        'target_ehr': target,
        'margin_at_budget': margin_at_budget,
        'projected_margin': projected_margin,
        'projected_ehr': projected_ehr,
    }


def feedback_revision_summary(projects, feedback_qs=None) -> dict:
    feedback_qs = feedback_qs if feedback_qs is not None else Feedback.objects.all()
    revision_count = 0
    included_limit = 0
    excess_count = 0

    for project in projects:
        project_revisions = feedback_qs.filter(project=project, category='Revision').count()
        project_limit = int(project.revision_limit or 0)
        revision_count += project_revisions
        included_limit += project_limit
        excess_count += max(0, project_revisions - project_limit)

    return {
        'revision_count': revision_count,
        'included_revision_limit': included_limit,
        'excess_revision_count': excess_count,
    }

@dataclass(frozen=True) # makes the object immutable.
class ClientProfitability:
    total_revenue: float
    total_hours: float
    ehr: float | None
    avg_designer_rate: float | None
    profit_margin_pct: float | None


def client_profitability_metrics(projects, log_qs) -> ClientProfitability:
    total_revenue = float(projects.aggregate(total=Sum('budget_amount'))['total'] or 0)
    total_hours = logged_hours(log_qs)
    ehr = total_revenue / total_hours if total_hours >= EHR_MIN_HOURS else None
    rate = weighted_designer_rate(log_qs, total_hours)
    margin = (
        (ehr - rate) / ehr * 100
        if ehr is not None and rate is not None
        else None
    )
    return ClientProfitability(
        total_revenue=total_revenue,
        total_hours=total_hours,
        ehr=ehr,
        avg_designer_rate=rate,
        profit_margin_pct=margin,
    )
