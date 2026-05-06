from django.contrib import admin
from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ('project', 'sender', 'created_at', 'read_by_count')
    list_filter   = ('project',)
    raw_id_fields = ('project', 'sender')

    @admin.display(description='Read by')
    def read_by_count(self, obj):
        return obj.read_by.count()