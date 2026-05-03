from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid

# Custom user manager, since the default one requires username field.
class UserManager(BaseUserManager):
    def create_user(self, email, full_name, role, password=None):
        if not email:
            raise ValueError('Email is required')
        # calls the User model from below, normalize for lower case.
        user = self.model(email=self.normalize_email(email), full_name=full_name, role=role)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password, role='Manager'):
        user = self.create_user(email, full_name, role, password)
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        # Save to default database.
        user.save(using=self._db)
        return user

# AbstractBaseUser for custom user and password hashing, PermissionsMixin for permissions (is_staff).
class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('Manager', 'Manager'),
        ('Designer', 'Designer'),
        ('Client', 'Client'),
    ]
    email      = models.EmailField(unique=True)
    full_name  = models.CharField(max_length=100)
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES)
    is_active  = models.BooleanField(default=False)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    profile_picture = models.ImageField(upload_to='avatars/', null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    def __str__(self):
        return f'{self.full_name} ({self.role})'


# OneToOne = 1 User can only have 1 Profile. CASCADE = If User is deleted, the Profile is also deleted.
class Designer(models.Model):
    user                     = models.OneToOneField(User, on_delete=models.CASCADE, related_name='designer_profile')
    hourly_rate              = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    specialization           = models.CharField(max_length=50, blank=True)
    # Database can store it as null, can also be empty/blank.
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
        # Set expiration date if not already set, 48 hours from now (or 2 days).
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=48)
        # Called after modifying field values to update database.
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()

    def __str__(self):
        return f'Token for {self.user.email} (used={self.is_used})'
