from django.db import models
from apps.tasks.models import Task
from apps.users.models import Designer


class TimeLog(models.Model):
    task        = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_logs')
    designer    = models.ForeignKey(Designer, on_delete=models.CASCADE, related_name='time_logs')
    hours_spent = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['task', 'designer']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f'{self.hours_spent}h by {self.designer.user.full_name} on {self.task.task_name}'
    

class TimerSession(models.Model):
    STATE_CHOICES = [('running', 'Running'), ('paused', 'Paused')]

    designer         = models.ForeignKey(Designer, on_delete=models.CASCADE, related_name='timer_sessions')
    task             = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='timer_sessions')
    state            = models.CharField(max_length=10, choices=STATE_CHOICES, default='running')
    started_at       = models.DateTimeField()   # start of the current run segment
    accumulated_secs = models.IntegerField(default=0)
    paused_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('designer', 'task')

    def elapsed_secs(self):
        from django.utils import timezone
        if self.state == 'running':
            return self.accumulated_secs + int((timezone.now() - self.started_at).total_seconds())
        return self.accumulated_secs

    def __str__(self):
        return f'{self.designer.user.full_name} — {self.task.task_name} ({self.state})'


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('start',  'Start'),
        ('pause',  'Pause'),
        ('resume', 'Resume'),
        ('stop',   'Stop'),
    ]

    designer     = models.ForeignKey(Designer, on_delete=models.CASCADE, related_name='activity_logs')
    task         = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='activity_logs')
    action       = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp    = models.DateTimeField(auto_now_add=True)
    hours_logged = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        indexes  = [models.Index(fields=['designer', 'timestamp'])]
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.designer.user.full_name} {self.action} {self.task.task_name}'