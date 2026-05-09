from django.contrib import admin
from .models import TimeLog, TimerSession, ActivityLog


@admin.register(TimeLog)
class TimeLogAdmin(admin.ModelAdmin):
    list_display  = ('designer', 'task', 'hours_spent', 'created_at')
    list_filter   = ('designer', 'task__project')
    raw_id_fields = ('task', 'designer')


@admin.register(TimerSession)
class TimerSessionAdmin(admin.ModelAdmin):
    list_display  = ('designer', 'task', 'state', 'started_at', 'accumulated_secs', 'paused_at')
    list_filter   = ('state',)
    raw_id_fields = ('task', 'designer')
    readonly_fields = ('started_at', 'paused_at')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display  = ('designer', 'task', 'action', 'timestamp', 'hours_logged')
    list_filter   = ('action',)
    raw_id_fields = ('task', 'designer')
    readonly_fields = ('timestamp',)