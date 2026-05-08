from rest_framework import serializers
from django.utils import timezone
from .models import Feedback


class FeedbackReadSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model  = Feedback
        fields = [
            'id', 'project', 'project_name', 'category',
            'content_text', 'status', 'submitted_at', 'resolved_at',
        ]


class FeedbackWriteSerializer(serializers.ModelSerializer):
    # Used by Client on create only.
    # 'status' is excluded — defaults to 'Pending'; clients cannot set it.
    class Meta:
        model  = Feedback
        fields = ['project', 'category', 'content_text']


class FeedbackStatusSerializer(serializers.ModelSerializer):
    """
    Used by Manager/Designer on PATCH.
    Only 'status' is writable; resolved_at is set automatically on transition.
    """

    class Meta:
        model  = Feedback
        fields = ['status']

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)
        if new_status == 'Resolved' and instance.status != 'Resolved':
            # Set resolved_at on first transition to Resolved only.
            validated_data['resolved_at'] = timezone.now()
        elif new_status != 'Resolved':
            validated_data['resolved_at'] = None
        return super().update(instance, validated_data)
