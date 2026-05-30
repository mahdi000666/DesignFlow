from django.db import models
from apps.projects.models import Project
from apps.users.models import User


class FileUpload(models.Model):
    FILE_TYPE_CHOICES = [
    ('deliverable', 'Deliverable'),
    ('reference', 'Reference'), # A reference is a visual inspiration or direction, can be a screenshot of a competitor's website.
    ('brand_guideline', 'Brand Guideline'), # A brand guideline is a formal brand identity rules. A PDF specifying exact logo usage, approved hex colours, font families, spacing rules.
    ]
    project     = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    file_type   = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    file_name   = models.CharField(max_length=255)
    file_path   = models.CharField(max_length=500)    # Path within MEDIA_ROOT
    file_size   = models.IntegerField()                # Bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.file_name} ({self.project.project_name})'