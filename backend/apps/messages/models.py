from django.db import models
from apps.projects.models import Project
from apps.users.models import User


class Message(models.Model):
    project      = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='messages')
    sender       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content_text = models.TextField()
    # Replaced scalar is_read with per-user M2M tracking.
    read_by      = models.ManyToManyField(User, blank=True, related_name='read_messages')
    created_at   = models.DateTimeField(auto_now_add=True)
    feedback     = models.ForeignKey(
        'feedback.Feedback',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
    )

    class Meta:
        indexes = [models.Index(fields=['project', 'created_at'])]
        ordering = ['created_at']