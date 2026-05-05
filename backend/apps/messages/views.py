from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Message
from .serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    # Messages are immutable once sent — no PATCH/PUT/DELETE.
    http_method_names  = ['get', 'post', 'head', 'options']
    serializer_class   = MessageSerializer
    pagination_class   = None

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')
        # ?replies=1 returns reply messages; default returns chat messages only.
        is_replies = self.request.query_params.get('replies') == '1'

        if user.role == 'Manager':
            qs = Message.objects.select_related('sender').all()
        elif user.role == 'Designer':
            qs = Message.objects.filter(
                project__assignments__designer__user=user
            ).select_related('sender')
        elif user.role == 'Client':
            qs = Message.objects.filter(
                project__client__user=user
            ).select_related('sender')
        else:
            qs = Message.objects.none()

        if project_id:
            qs = qs.filter(project_id=project_id)

        qs = qs.filter(feedback__isnull=not is_replies)

        return qs.distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        user = self.request.user
        if user.role == 'Designer':
            if not project.assignments.filter(designer__user=user).exists():
                raise PermissionDenied('You are not assigned to this project.')
        elif user.role == 'Client':
            if project.client.user != user:
                raise PermissionDenied('You can only message on your own projects.')
        serializer.save(sender=user)

    @action(detail=False, methods=['post'], url_path='mark-read')
    def mark_read(self, request):
        project_id = request.data.get('project')
        if not project_id:
            return Response({'error': 'project is required'}, status=400)

        user = request.user

        # Base filter: unread chat messages in this project not sent by the caller.
        qs = Message.objects.filter(
            project_id=project_id,
            feedback__isnull=True,
            is_read=False,
        ).exclude(sender=user)

        # Enforce the same row-level access as get_queryset.
        if user.role == 'Designer':
            qs = qs.filter(project__assignments__designer__user=user)
        elif user.role == 'Client':
            qs = qs.filter(project__client__user=user)
        elif user.role != 'Manager':
            return Response({'marked': 0})

        updated = qs.update(is_read=True)
        return Response({'marked': updated})