from django.db import models
from apps.projects.models import Project


class Task(models.Model):
    STATUS_CHOICES = [
        ('Todo', 'Todo'),
        ('InProgress', 'InProgress'),
        ('Completed', 'Completed'),
    ]
    project         = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    parent_task     = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtasks')
    task_name       = models.CharField(max_length=100)
    description     = models.TextField(blank=True)
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status          = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Todo')
    is_unplanned    = models.BooleanField(default=False)   # True = scope creep task
    created_at      = models.DateTimeField(auto_now_add=True)
    completed_at    = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['is_unplanned']),
        ]

    def __str__(self):
        return f'{self.task_name} ({self.project.project_name})'