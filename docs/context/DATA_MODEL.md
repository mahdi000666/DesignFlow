# Data Model

> Open this when writing models, serializers, or analytics queries.
> All model code is derived from the ERD and class diagram. Field names are exact.

---

## Entity Relationships

```
User ──< InvitationToken
User ──1 Designer ──< ProjectAssignment >── Project ──< Task ──< TimeLog
User ──1 Client   ──< Project ──< Feedback
                       Project ──< Message
                       Project ──< FileUpload
                       Task ──< Task (subtasks via parent_task)
Designer ──< TimerSession >── Task
Designer ──< ActivityLog  >── Task
```

---

## Models

### apps/users/models.py

```python
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, full_name, role, password=None):
        if not email:
            raise ValueError('Email is required')
        user = self.model(email=self.normalize_email(email), full_name=full_name, role=role)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password, role='Manager'):
        if not email:
            raise ValueError('Email is required')
        if role != 'Manager':
            raise ValueError('Superusers must use the Manager role')
        user = self.model(
            email=self.normalize_email(email),
            full_name=full_name,
            role=role,
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('Manager', 'Manager'),
        ('Designer', 'Designer'),
        ('Client', 'Client'),
    ]
    email      = models.EmailField(unique=True)
    full_name  = models.CharField(max_length=100)
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES)
    is_active  = models.BooleanField(default=False)   # False until invitation accepted
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    profile_picture = models.ImageField(upload_to='avatars/', null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    def __str__(self):
        return f'{self.full_name} ({self.role})'


class Designer(models.Model):
    user                     = models.OneToOneField(User, on_delete=models.CASCADE, related_name='designer_profile')
    hourly_rate              = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    specialization           = models.CharField(max_length=50, blank=True)
    available_hours_per_week = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f'Designer: {self.user.full_name}'


class Client(models.Model):
    user     = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    phone    = models.CharField(max_length=20, blank=True)
    industry = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f'Client: {self.user.full_name}'


class InvitationToken(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invitation_tokens')
    token      = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=48)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f'Token for {self.user.email} (used={self.is_used})'
```

**Key rules:**
- `is_active=False` by default — set to `True` only after invitation activation
- Login uses `email`, not `username` — requires the custom `UserManager` above
- `Designer` and `Client` profile records are created automatically via a `post_save` signal on `User`

---

### apps/projects/models.py

```python
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
```

**Key rules:**
- `on_delete=PROTECT` on `client` FK — cannot delete a Client who owns projects
- `budget_amount / budget_hours` gives the target hourly rate
- `unique_together` prevents assigning the same designer to a project twice

---

### apps/tasks/models.py

```python
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
    completed_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['is_unplanned']),
        ]

    def __str__(self):
        return f'{self.task_name} ({self.project.project_name})'
```

**Key rules:**
- `is_unplanned=True` marks scope creep — set when a task is added after project kickoff
- `parent_task=None` = top-level task; otherwise it's a subtask
- Scope Creep Index = `COUNT(is_unplanned=True) / COUNT(*) * 100` per project

---

### apps/timelog/models.py

```python
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
```

**Key rules:**
- Source of truth for all time-based analytics
- `SUM(hours_spent)` per project vs `Project.budget_hours` = budget variance
- `Project.budget_amount / SUM(hours_spent)` = Effective Hourly Rate
- TimerSession — one row per active/paused timer; unique_together (designer, task); deleted on stop
- ActivityLog — append-only audit trail of start/pause/resume/stop events; hours_logged set only on stop
- Only one running TimerSession per designer at a time — starting a new task auto-pauses the previous one

---

### apps/feedback/models.py

```python
from django.db import models
from apps.projects.models import Project
from apps.users.models import Client


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
        indexes = [
            models.Index(fields=['project', 'category', 'status']),
            models.Index(fields=['submitted_at']),
        ]

    def __str__(self):
        return f'{self.category} on {self.project.project_name} ({self.status})'
```

**Key rules:**
- `category='Revision'` items drive Revision-to-Approval Ratio metric
- `resolved_at` should be set automatically when status transitions to `'Resolved'` (handle in serializer `update()`)

---

### apps/messages/models.py

```python
from django.db import models
from apps.projects.models import Project
from apps.users.models import User


class Message(models.Model):
    project         = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='messages')
    sender          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content_text    = models.TextField()
    read_by         = models.ManyToManyField(User, blank=True, related_name='read_messages')
    created_at      = models.DateTimeField(auto_now_add=True)
    feedback        = models.ForeignKey(
        'feedback.Feedback',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
    )

    class Meta:
        indexes = [models.Index(fields=['project', 'created_at'])]
        ordering = ['created_at']
```

---

### apps/files/models.py

```python
from django.db import models
from apps.projects.models import Project
from apps.users.models import User


class FileUpload(models.Model):
    FILE_TYPE_CHOICES = [
    ('deliverable', 'Deliverable'),
    ('reference', 'Reference'),
    ('brand_guideline', 'Brand Guideline'),
    ]
    project     = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    file_type   = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    file_name   = models.CharField(max_length=255)
    file_path   = models.CharField(max_length=500)    # Path within MEDIA_ROOT
    file_size   = models.IntegerField()                # Bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.file_name} ({self.project.project_name})'
```

**Key rules:**
- Files stored at `MEDIA_ROOT/projects/{project_id}/`
- Access controlled by API permissions — never expose file paths directly

---

## Key Analytical Queries

These are the core ORM queries that power the analytics endpoints.

```python
from django.db.models import Sum, Count, F, Q, ExpressionWrapper, DecimalField
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.users.models import Designer, Client

# Effective Hourly Rate per project
Project.objects.annotate(
    actual_hours=Sum('tasks__time_logs__hours_spent'),
    ehr=ExpressionWrapper(
        F('budget_amount') / Sum('tasks__time_logs__hours_spent'),
        output_field=DecimalField()
    )
).filter(actual_hours__gt=0)

# Budget variance per project (actual vs estimated)
Task.objects.filter(project=project).aggregate(
    total_estimated=Sum('estimated_hours'),
    total_actual=Sum('time_logs__hours_spent'),
)

# Scope creep index per project
Task.objects.filter(project=project).aggregate(
    total=Count('id'),
    unplanned=Count('id', filter=Q(is_unplanned=True)),
)
# Index = unplanned / total * 100

# Client profitability ranking
Client.objects.annotate(
    total_revenue=Sum('projects__budget_amount'),
    total_hours=Sum('projects__tasks__time_logs__hours_spent'),
    revision_count=Count('feedback', filter=Q(feedback__category='Revision')),
).order_by('-total_revenue')

# Designer utilisation
Designer.objects.annotate(
    logged_hours=Sum('time_logs__hours_spent'),
    utilization=ExpressionWrapper(
        F('logged_hours') / F('available_hours_per_week') * 100,
        output_field=DecimalField()
    )
)

# Revision-to-approval ratio per project
from apps.feedback.models import Feedback
Feedback.objects.filter(project=project).aggregate(
    revisions=Count('id', filter=Q(category='Revision')),
    approvals=Count('id', filter=Q(category='Approval')),
)
```
