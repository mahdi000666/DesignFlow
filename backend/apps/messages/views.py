from rest_framework import viewsets, permissions
from .models import Message
from .serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    # Messages are immutable once sent — no PATCH/PUT/DELETE.
    http_method_names  = ['get', 'post', 'head', 'options']
    serializer_class   = MessageSerializer

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
        # sender is always the authenticated user — never taken from the request body
        serializer.save(sender=self.request.user)