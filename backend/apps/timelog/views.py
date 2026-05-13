from decimal import Decimal
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.tasks.models import Task
from apps.users.permissions import IsDesigner, IsManager
from .models import TimeLog, TimerSession, ActivityLog
from .serializers import (
    TimeLogReadSerializer, TimeLogWriteSerializer,
    TimerSessionSerializer, ActivityLogSerializer,
)


class TimeLogViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    # No PUT — partial PATCH is enough for correcting a log entry.
    http_method_names  = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')
        task_id    = self.request.query_params.get('task')

        if user.role == 'Manager':
            qs = TimeLog.objects.select_related(
                'task__project', 'designer__user'
            ).all()
        elif user.role == 'Designer':
            qs = TimeLog.objects.filter(
                task__project__assignments__designer__user=user
            ).select_related('task__project', 'designer__user')
        else:
            qs = TimeLog.objects.none()

        if project_id:
            qs = qs.filter(task__project_id=project_id)
        if task_id:
            qs = qs.filter(task_id=task_id)

        designer_user_id = self.request.query_params.get('designer_user_id')
        if designer_user_id and user.role == 'Manager':
            qs = qs.filter(designer__user_id=designer_user_id)

        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TimeLogWriteSerializer
        return TimeLogReadSerializer

    def get_permissions(self):
        if self.action == 'create':
            # Only designers log time; managers track via reports.
            return [IsDesigner()]
        if self.action in ('partial_update', 'destroy'):
            return [IsManager()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        task = serializer.validated_data['task']
        designer = self.request.user.designer_profile
        if not task.project.assignments.filter(designer=designer).exists():
            raise PermissionDenied('You are not assigned to this project.')
        serializer.save(designer=designer)

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

# ─── Timer endpoints ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsDesigner])
def active_timers(request):
    sessions = (
        TimerSession.objects
        .filter(designer=request.user.designer_profile)
        .select_related('task__project')
    )
    return Response(TimerSessionSerializer(sessions, many=True).data)


@api_view(['POST'])
@permission_classes([IsDesigner])
def timer_start(request):
    task_id  = request.data.get('task_id')
    designer = request.user.designer_profile

    if not task_id:
        return Response({'detail': 'task_id required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        task = Task.objects.get(pk=task_id, project__assignments__designer=designer)
    except Task.DoesNotExist:
        return Response({'detail': 'Task not found or not assigned.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()

    # Auto-pause any other running session for this designer.
    running = TimerSession.objects.filter(designer=designer, state='running').exclude(task_id=task_id).first()
    if running:
        elapsed = int((now - running.started_at).total_seconds())
        running.accumulated_secs += elapsed
        running.state     = 'paused'
        running.paused_at = now
        running.save()
        ActivityLog.objects.create(designer=designer, task=running.task, action='pause')

    session, created = TimerSession.objects.get_or_create(
        designer=designer,
        task=task,
        defaults={'state': 'running', 'started_at': now, 'accumulated_secs': 0},
    )

    if not created:
        if session.state == 'running':
            return Response({'detail': 'Timer already running.'}, status=status.HTTP_400_BAD_REQUEST)
        # Treat start on a paused session as resume.
        session.state      = 'running'
        session.started_at = now
        session.paused_at  = None
        session.save()
        ActivityLog.objects.create(designer=designer, task=task, action='resume')
    else:
        ActivityLog.objects.create(designer=designer, task=task, action='start')

    return Response(TimerSessionSerializer(session).data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsDesigner])
def timer_pause(request):
    task_id  = request.data.get('task_id')
    designer = request.user.designer_profile

    try:
        session = TimerSession.objects.get(designer=designer, task_id=task_id)
    except TimerSession.DoesNotExist:
        return Response({'detail': 'No active timer for this task.'}, status=status.HTTP_404_NOT_FOUND)

    if session.state != 'running':
        return Response({'detail': 'Timer is not running.'}, status=status.HTTP_400_BAD_REQUEST)

    now     = timezone.now()
    elapsed = int((now - session.started_at).total_seconds())
    session.accumulated_secs += elapsed
    session.state     = 'paused'
    session.paused_at = now
    session.save()
    ActivityLog.objects.create(designer=designer, task=session.task, action='pause')
    return Response(TimerSessionSerializer(session).data)


@api_view(['POST'])
@permission_classes([IsDesigner])
def timer_resume(request):
    task_id  = request.data.get('task_id')
    designer = request.user.designer_profile

    try:
        session = TimerSession.objects.get(designer=designer, task_id=task_id)
    except TimerSession.DoesNotExist:
        return Response({'detail': 'No timer for this task.'}, status=status.HTTP_404_NOT_FOUND)

    if session.state != 'paused':
        return Response({'detail': 'Timer is not paused.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()

    # Auto-pause any other running session.
    running = TimerSession.objects.filter(designer=designer, state='running').first()
    if running:
        elapsed = int((now - running.started_at).total_seconds())
        running.accumulated_secs += elapsed
        running.state     = 'paused'
        running.paused_at = now
        running.save()
        ActivityLog.objects.create(designer=designer, task=running.task, action='pause')

    session.state      = 'running'
    session.started_at = now
    session.paused_at  = None
    session.save()
    ActivityLog.objects.create(designer=designer, task=session.task, action='resume')
    return Response(TimerSessionSerializer(session).data)


@api_view(['POST'])
@permission_classes([IsDesigner])
def timer_stop(request):
    task_id  = request.data.get('task_id')
    designer = request.user.designer_profile

    try:
        session = TimerSession.objects.get(designer=designer, task_id=task_id)
    except TimerSession.DoesNotExist:
        return Response({'detail': 'No timer for this task.'}, status=status.HTTP_404_NOT_FOUND)
    
    total_secs = session.accumulated_secs
    if session.state == 'running':
        total_secs += int((timezone.now() - session.started_at).total_seconds())

    hours = (Decimal(total_secs) / Decimal(3600)).quantize(Decimal('0.01'))

    timelog = TimeLog.objects.create(
        task=session.task,
        designer=designer,
        hours_spent=hours,
        description=request.data.get('description', ''),
    )
    ActivityLog.objects.create(designer=designer, task=session.task, action='stop', hours_logged=hours)
    session.delete()
    return Response(TimeLogReadSerializer(timelog).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def activity_logs(request):
    user = request.user

    if user.role == 'Manager':
        designer_user_id = request.query_params.get('designer_user_id')
        if not designer_user_id:
            return Response({'detail': 'designer_user_id required.'}, status=status.HTTP_400_BAD_REQUEST)
        logs = (
            ActivityLog.objects
            .filter(designer__user_id=designer_user_id)
            .select_related('task__project', 'designer__user')
            .order_by('-timestamp')[:100]
        )
    elif user.role == 'Designer':
        logs = (
            ActivityLog.objects
            .filter(designer=user.designer_profile)
            .select_related('task__project', 'designer__user')
            .order_by('-timestamp')[:50]
        )
    else:
        return Response(status=status.HTTP_403_FORBIDDEN)

    return Response(ActivityLogSerializer(logs, many=True).data)
