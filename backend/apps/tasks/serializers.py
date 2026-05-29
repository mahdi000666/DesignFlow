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
        # Fetches all child tasks (where parent_task = this task's id).
        # many=True tells the serializer to loop over all objects in the collection and produce a list.
        return TaskReadSerializer(obj.subtasks.all(), many=True).data


class TaskWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Task
        fields = [
            'project', 'parent_task', 'task_name', 'description',
            'estimated_hours', 'status', 'is_unplanned',
        ]

    def validate_estimated_hours(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Estimated hours must be greater than 0.')
        return value

    def validate(self, attrs):
        parent  = attrs.get('parent_task')
        # On CREATE: 'project' will be in attrs — the user submitted it.
        # On UPDATE: the user might not re-submit 'project' (they're just changing status).
        # so we fall back to self.instance.project (the already-saved value).
        project = attrs.get('project', getattr(self.instance, 'project', None))

        # self.instance = the existing Task row from the database (None on create).

        # Rule 1: if parent_task is given, it must belong to the same project. This prevents making subtasks of a task from a different project.
        if parent and parent.project_id != project.id:
            raise serializers.ValidationError(
                {'parent_task': 'Parent task must belong to the same project.'}
            )
        
        # Rule 2: only runs on edit because self.instance is None on create.
        if parent and self.instance:
            # self.instance is the task currently being edited
            if parent.pk == self.instance.pk:
                raise serializers.ValidationError(
                    {'parent_task': 'A task cannot be its own parent.'}
                )
            # This prevents circular tasks.
            # Imagine this chain: Task 1 → parent is Task 2 → parent is Task 3.
            # Now someone tries to set Task 3's parent to Task 1. That would create an infinite loop: 1→2→3→1→2→3.
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
        # Sets completed_at to now when status transitions TO Completed.
        if new_status == 'Completed' and instance.status != 'Completed':
            validated_data['completed_at'] = timezone.now()
        # Clears it when status moves AWAY from Completed (e.g. reopened).
        elif new_status != 'Completed' and instance.status == 'Completed':
            validated_data['completed_at'] = None
        return super().update(instance, validated_data)


# Intentionally only exposes 'status' — this is the Designer-facing serializer.
class TaskStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['status']

    def validate(self, attrs):
        # Detects if any extra fields beyond 'status' was sent. Designers may only change status.
        # Substracts any current fields with status, if the result is non zero then there were unexpected fields. If the result is empty, then the correct field was sent.
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
