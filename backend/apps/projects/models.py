from django.db import models
from apps.users.models import Client, Designer


class Project(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Completed', 'Completed'),
        ('OnHold', 'OnHold'),
    ]
    client          = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='projects')
    project_name    = models.CharField(max_length=100)
    description     = models.TextField(blank=True)
    budget_hours    = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    budget_amount   = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    revision_limit  = models.PositiveIntegerField(default=2)
    deadline        = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    category        = models.CharField(max_length=100, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['client', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.project_name


class ProjectAssignment(models.Model):
    project     = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='assignments')
    designer    = models.ForeignKey(Designer, on_delete=models.CASCADE, related_name='assignments')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'designer')

    def __str__(self):
        return f'{self.designer.user.full_name} → {self.project.project_name}'
