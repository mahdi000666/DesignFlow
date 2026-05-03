from django.db import models
from apps.projects.models import Project

class Feedback(models.Model):
    CATEGORY_CHOICES = [
        ('Revision', 'Revision'),
        ('Approval', 'Approval'),
        ('Question', 'Question'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('InProgress', 'InProgress'),
        ('Resolved', 'Resolved'),
    ]
    project      = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='feedback')
    category     = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    content_text = models.TextField()
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    resolved_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['project', 'category', 'status']),
            models.Index(fields=['submitted_at']),
        ]

    def __str__(self):
        return f'{self.category} on {self.project.project_name} ({self.status})'