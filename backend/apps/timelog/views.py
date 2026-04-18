from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied

from .models import TimeLog
from .serializers import TimeLogReadSerializer, TimeLogWriteSerializer
from apps.users.permissions import IsDesigner, IsManagerOrDesigner


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
            # Designers only see logs they created.
            qs = TimeLog.objects.filter(
                designer__user=user
            ).select_related('task__project', 'designer__user')
        else:
            qs = TimeLog.objects.none()

        if project_id:
            qs = qs.filter(task__project_id=project_id)
        if task_id:
            qs = qs.filter(task_id=task_id)

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
            return [IsManagerOrDesigner()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        task = serializer.validated_data['task']
        designer = self.request.user.designer_profile
        if not task.project.assignments.filter(designer=designer).exists():
            raise PermissionDenied('You are not assigned to this project.')
        serializer.save(designer=designer)

    def perform_update(self, serializer):
        # serializer.instance is the already-fetched object — no second DB hit.
        if (self.request.user.role != 'Manager'
                and serializer.instance.designer.user != self.request.user):
            raise PermissionDenied('You may only edit your own time logs.')
        serializer.save()

    def perform_destroy(self, instance):
        if (self.request.user.role != 'Manager'
                and instance.designer.user != self.request.user):
            raise PermissionDenied('You may only delete your own time logs.')
        instance.delete()