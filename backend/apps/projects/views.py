from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Project, ProjectAssignment
from .serializers import (
    ProjectReadSerializer,
    ProjectWriteSerializer,
    AssignDesignerSerializer,
)
from apps.users.permissions import IsManager, IsManagerOrDesigner


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    # --- queryset -------------------------------------------------------

    def get_queryset(self):
        user = self.request.user
        qs = Project.objects.select_related('client__user').prefetch_related(
            'assignments__designer__user'
        )
        if user.role == 'Manager':
            return qs.all()
        if user.role == 'Designer':
            return qs.filter(assignments__designer__user=user)
        if user.role == 'Client':
            return qs.filter(client__user=user)
        return Project.objects.none()

    # --- serializer -----------------------------------------------------

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ProjectWriteSerializer
        return ProjectReadSerializer

    # --- permissions ----------------------------------------------------

    def get_permissions(self):
        if self.action in ('create', 'destroy', 'assign_designer', 'remove_designer'):
            return [IsManager()]
        if self.action in ('update', 'partial_update'):
            return [IsManagerOrDesigner()]
        return [IsAuthenticated()]

    # --- custom action --------------------------------------------------

    @action(detail=True, methods=['post'], url_path='assign')
    def assign_designer(self, request, pk=None):
        project    = get_object_or_404(Project, pk=pk)
        serializer = AssignDesignerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        designer = serializer.validated_data['designer_id']
        _, created = ProjectAssignment.objects.get_or_create(
            project=project, designer=designer
        )
        if not created:
            return Response(
                {'detail': 'Designer already assigned to this project.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Designer assigned.'}, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'], url_path='assign/(?P<designer_id>[^/.]+)')
    def remove_designer(self, request, pk=None, designer_id=None):
        project    = get_object_or_404(Project, pk=pk)
        assignment = get_object_or_404(ProjectAssignment, project=project, designer_id=designer_id)
        assignment.delete()
        return Response({'detail': 'Designer removed.'}, status=status.HTTP_204_NO_CONTENT)