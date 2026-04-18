from rest_framework import serializers
from .models import TimeLog


class TimeLogReadSerializer(serializers.ModelSerializer):
    task_name     = serializers.CharField(source='task.task_name',           read_only=True)
    project_id    = serializers.IntegerField(source='task.project_id',       read_only=True)
    project_name  = serializers.CharField(source='task.project.project_name', read_only=True)
    designer_name = serializers.CharField(source='designer.user.full_name',  read_only=True)
    designer_user_id = serializers.IntegerField(source='designer.user.id', read_only=True)

    class Meta:
        model  = TimeLog
        fields = [
            'id', 'task', 'task_name', 'project_id', 'project_name',
            'designer', 'designer_name', 'designer_user_id', 'hours_spent', 'description', 'created_at',
        ]


class TimeLogWriteSerializer(serializers.ModelSerializer):
    # 'designer' is intentionally excluded — set from request.user in perform_create.
    class Meta:
        model  = TimeLog
        fields = ['task', 'hours_spent', 'description']

    def validate_hours_spent(self, value):
        if value <= 0:
            raise serializers.ValidationError('hours_spent must be a positive number.')
        return value