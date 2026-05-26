from rest_framework import serializers
from django.db.models import Sum
from .models import Project, ProjectAssignment
from apps.users.models import Designer


class ProjectAssignmentReadSerializer(serializers.ModelSerializer):
    designer_id   = serializers.IntegerField(source='designer.id', read_only=True)
    designer_name = serializers.CharField(source='designer.user.full_name', read_only=True)
    avatar_url    = serializers.SerializerMethodField()

    class Meta:
        model  = ProjectAssignment
        fields = ['designer_id', 'designer_name', 'assigned_at', 'avatar_url']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        user = obj.designer.user

        # If user has no avatar, return None.
        if not hasattr(user, 'profile_picture') or not user.profile_picture:
            return None
        
        # Build absolute URL because the frontend needs absolute URLs to display images.
        return request.build_absolute_uri(user.profile_picture.url) if request else user.profile_picture.url


class ProjectReadSerializer(serializers.ModelSerializer):
    client_name  = serializers.CharField(source='client.user.full_name', read_only=True)
    actual_hours = serializers.SerializerMethodField()
    assignments  = ProjectAssignmentReadSerializer(many=True, read_only=True)

    class Meta:
        model  = Project
        fields = [
            'id', 'project_name', 'description', 'status', 'category',
            'budget_hours', 'budget_amount', 'deadline',
            'client', 'client_name', 'actual_hours', 'assignments',
            'created_at', 'updated_at',
        ]

    def get_actual_hours(self, obj):
        result = obj.tasks.aggregate(total=Sum('time_logs__hours_spent'))
        return result['total'] or 0


class ProjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Project
        fields = [
            'client', 'project_name', 'description',
            'budget_hours', 'budget_amount', 'deadline', 'status', 'category',
        ]

    def validate_budget_hours(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Budget hours must be greater than 0.')
        return value

    def validate_budget_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Budget amount must be greater than 0.')
        return value


class AssignDesignerSerializer(serializers.Serializer):
    # Accepts a plain designer PK — no model instance needed on this payload.
    designer_id = serializers.PrimaryKeyRelatedField(
    # Before accepting that number, check the Designer table to make sure it actually exists.
    # Fetch the user profile too, in case we need it later.
        queryset=Designer.objects.select_related('user').all()
    )
