from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)

    class Meta:
        model  = Message
        fields = ['id', 'project', 'sender', 'sender_name', 'content_text', 'is_read', 'created_at']
        # sender is set server-side in perform_create; clients must not be able to spoof it
        read_only_fields = ['sender', 'is_read', 'created_at']