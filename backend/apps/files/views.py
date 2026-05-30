from django.conf import settings
from rest_framework import viewsets, parsers, permissions
from rest_framework.exceptions import PermissionDenied

from .models import FileUpload
from .serializers import FileUploadReadSerializer, FileUploadWriteSerializer


class FileUploadViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    # Handles multipart/form-data encoding.
    parser_classes     = [parsers.MultiPartParser, parsers.FormParser] # MultiPartParser handles the file bytes. FormParser handles regular form fields sent alongside.
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

        return qs.distinct() # Prevents duplicate when joining tables. Without it, a designer on a project with three assignments would see every file three times.

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

        # Remove only files that resolve inside MEDIA_ROOT. resolve() eliminates ../../ in the path for security reasons.
        media_root = settings.MEDIA_ROOT.resolve()
        full_path = (settings.MEDIA_ROOT / instance.file_path).resolve()
        if media_root not in full_path.parents:
            raise PermissionDenied('Invalid file path.')
        if full_path.exists():
            full_path.unlink() # Dlete from disk; no error if already gone.

        instance.delete() # Delete the DB record.
