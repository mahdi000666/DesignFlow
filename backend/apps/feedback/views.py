from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied

from .models import Feedback
from .serializers import (
    FeedbackReadSerializer,
    FeedbackWriteSerializer,
    FeedbackStatusSerializer,
)
from apps.users.permissions import IsClient, IsManagerOrDesigner


class FeedbackViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')

        if user.role == 'Manager':
            qs = Feedback.objects.select_related('project').all()
        elif user.role == 'Designer':
            qs = Feedback.objects.filter(
                project__assignments__designer__user=user
            ).select_related('project')
        elif user.role == 'Client':
            qs = Feedback.objects.filter(
                project__client__user=user
            ).select_related('project')
        else:
            qs = Feedback.objects.none()

        if project_id:
            qs = qs.filter(project_id=project_id)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return FeedbackWriteSerializer
        if self.action == 'partial_update':
            return FeedbackStatusSerializer
        return FeedbackReadSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsClient()]
        if self.action == 'partial_update':
            return [IsManagerOrDesigner()]
        if self.action == 'destroy':
            return [IsClient()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        if project.client.user != self.request.user:
            raise PermissionDenied('You can only submit feedback on your own projects.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        # Only the client who submitted the feedback can delete it,
        # and only while it is still Pending (not yet actioned).
        if instance.project.client.user != user:
            raise PermissionDenied('You can only delete your own feedback.')
        if instance.status != 'Pending':
            raise PermissionDenied('Feedback that is already in progress or resolved cannot be deleted.')
        instance.delete()