from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Message
from .serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    # Messages are immutable once sent — no PATCH/PUT/DELETE.
    http_method_names  = ['get', 'post', 'head', 'options']
    serializer_class   = MessageSerializer
    # Disable pagination — all messages for a project are loaded at once.
    # A project's message history is bounded and needs to render in full for the chat UI.
    pagination_class   = None

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')

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