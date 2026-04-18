from django.conf import settings
from rest_framework import viewsets, parsers, permissions
from rest_framework.exceptions import PermissionDenied

from .models import FileUpload
from .serializers import FileUploadReadSerializer, FileUploadWriteSerializer


class FileUploadViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes     = [parsers.MultiPartParser, parsers.FormParser]
    # No PUT or PATCH — uploaded files are immutable; replace by delete + re-upload.
    http_method_names  = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')

        if user.role == 'Manager':
            qs = FileUpload.objects.select_related('project', 'uploaded_by').all()
        elif user.role == 'Designer':
            qs = FileUpload.objects.filter(
                project__assignments__designer__user=user
            ).select_related('project', 'uploaded_by')
        elif user.role == 'Client':
            qs = FileUpload.objects.filter(
                project__client__user=user
            ).select_related('project', 'uploaded_by')
        else:
            qs = FileUpload.objects.none()

        if project_id:
            qs = qs.filter(project_id=project_id)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return FileUploadWriteSerializer
        return FileUploadReadSerializer
    
    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        user = self.request.user
        if user.role == 'Designer':
            if not project.assignments.filter(designer__user=user).exists():
                raise PermissionDenied('You are not assigned to this project.')
        elif user.role == 'Client':
            if project.client.user != user:
                raise PermissionDenied('You can only upload to your own projects.')
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        # Managers can delete any file.
        # Designers and Clients can only delete files they uploaded themselves.
        if user.role != 'Manager' and instance.uploaded_by != user:
            raise PermissionDenied('You can only delete files you uploaded.')

        # Remove the physical file from disk.
        full_path = settings.MEDIA_ROOT / instance.file_path
        if full_path.exists():
            full_path.unlink()

        instance.delete()