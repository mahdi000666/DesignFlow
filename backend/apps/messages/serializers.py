from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_avatar_url = serializers.SerializerMethodField()
    is_read     = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Message
        fields = ['id', 'project', 'sender', 'sender_name', 'sender_avatar_url', 'content_text', 'is_read', 'created_at', 'feedback']
        read_only_fields = ['sender', 'is_read', 'created_at']

    def validate(self, attrs):
        feedback = attrs.get('feedback')
        project = attrs.get('project')
        if feedback is not None and project is not None and feedback.project_id != project.id:
            raise serializers.ValidationError({
                'feedback': 'Feedback replies must belong to the selected project.'
            })
        return attrs

    def get_sender_avatar_url(self, obj):
        request = self.context.get('request')
        pic = getattr(obj.sender, 'profile_picture', None)
        if not pic:
            return None
        return request.build_absolute_uri(pic.url) if request else pic.url
