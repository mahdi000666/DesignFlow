from django.db.models import Exists, OuterRef
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Message
from .serializers import MessageSerializer


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['get', 'post', 'head', 'options']
    serializer_class   = MessageSerializer
    pagination_class   = None

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')
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

        # Annotate is_read per requesting user via the M2M junction table.
        ReadThrough = Message.read_by.through
        qs = qs.annotate(
            is_read=Exists(
                ReadThrough.objects.filter(
                    message_id=OuterRef('pk'),
                    user_id=user.id,
                )
            )
        )

        return qs.distinct()

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        user    = self.request.user
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

        # Same row-level access as get_queryset, chat messages only.
        qs = Message.objects.filter(
            project_id=project_id,
            feedback__isnull=True,
        ).exclude(sender=user)

        if user.role == 'Designer':
            qs = qs.filter(project__assignments__designer__user=user)
        elif user.role == 'Client':
            qs = qs.filter(project__client__user=user)
        elif user.role != 'Manager':
            return Response({'marked': 0})

        # Bulk-insert into the junction table, silently skip already-read rows.
        ReadThrough = Message.read_by.through
        message_ids = list(qs.values_list('id', flat=True))
        ReadThrough.objects.bulk_create(
            [ReadThrough(message_id=mid, user_id=user.id) for mid in message_ids],
            ignore_conflicts=True,
        )

        return Response({'marked': len(message_ids)})