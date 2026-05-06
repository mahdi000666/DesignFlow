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

    def get_sender_avatar_url(self, obj):
        request = self.context.get('request')
        pic = getattr(obj.sender, 'profile_picture', None)
        if not pic:
            return None
        return request.build_absolute_uri(pic.url) if request else pic.url