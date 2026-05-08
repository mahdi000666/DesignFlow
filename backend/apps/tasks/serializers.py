from django.utils import timezone
from rest_framework import serializers
from .models import Task


class TaskReadSerializer(serializers.ModelSerializer):
    subtasks     = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model  = Task
        fields = [
            'id', 'project', 'project_name', 'parent_task',
            'task_name', 'description', 'estimated_hours',
            'status', 'is_unplanned', 'created_at', 'completed_at', 'subtasks',
        ]

    def get_subtasks(self, obj):
        # Only recurse one level — avoids expensive deep nesting for MVP.
        return TaskReadSerializer(obj.subtasks.all(), many=True).data


class TaskWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Task
        fields = [
            'project', 'parent_task', 'task_name', 'description',
            'estimated_hours', 'status', 'is_unplanned',
        ]

    def validate(self, attrs):
        parent  = attrs.get('parent_task')
        project = attrs.get('project', getattr(self.instance, 'project', None))
        if parent and parent.project_id != project.id:
            raise serializers.ValidationError(
                {'parent_task': 'Parent task must belong to the same project.'}
            )
        if parent and self.instance:
            if parent.pk == self.instance.pk:
                raise serializers.ValidationError(
                    {'parent_task': 'A task cannot be its own parent.'}
                )
            ancestor = parent.parent_task
            while ancestor is not None:
                if ancestor.pk == self.instance.pk:
                    raise serializers.ValidationError(
                        {'parent_task': 'Parent task cannot be one of this task\'s subtasks.'}
                    )
                ancestor = ancestor.parent_task
        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)
        if new_status == 'Completed' and instance.status != 'Completed':
            validated_data['completed_at'] = timezone.now()
        elif new_status != 'Completed' and instance.status == 'Completed':
            validated_data['completed_at'] = None
        return super().update(instance, validated_data)


class TaskStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['status']

    def validate(self, attrs):
        unexpected = set(self.initial_data.keys()) - {'status'}
        if unexpected:
            raise serializers.ValidationError({
                field: 'Designers may only update task status.'
                for field in sorted(unexpected)
            })
        return attrs

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)
        if new_status == 'Completed' and instance.status != 'Completed':
            validated_data['completed_at'] = timezone.now()
        elif new_status != 'Completed' and instance.status == 'Completed':
            validated_data['completed_at'] = None
        return super().update(instance, validated_data)
