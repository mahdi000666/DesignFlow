import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import User, Designer, Client, InvitationToken

# post_save is a signal that Django sends after a model’s save().
# receiver turns the function into the signal handler to execute the signal code.
# kwargs is not used but required by the signal API.
# sender=User restricts this to the User model.
# created is set by django, true on INSERT, false on UPDATE.
@receiver(post_save, sender=User)
def on_user_created(sender, instance, created, **kwargs):
    """
    Fires automatically after every User save.
    'created' is True only on first creation, False on updates.
    We only want to send an invitation on first creation.
    """
    # created is false so we exit.
    if not created:
        return
    if instance.is_staff or instance.is_superuser:
        return
    
    # Create profile
    if instance.role == 'Designer':
        Designer.objects.get_or_create(user=instance)
    elif instance.role == 'Client':
        Client.objects.get_or_create(user=instance)

    # Generate a unique token
    token = InvitationToken.objects.create(
        user=instance,
        token=str(uuid.uuid4()),
        expires_at=timezone.now() + timedelta(hours=48),
    )

    # Build the activation link
    activation_link = f"{settings.FRONTEND_URL}/activate?token={token.token}"

    # Send the email
    send_mail(
        subject='You have been invited to DesignFlow',
        message=f"""
Hi {instance.full_name},

You have been added to the DesignFlow platform as a {instance.role}.

Click the link below to set your password and activate your account:
{activation_link}

This link expires in 48 hours and can only be used once.

If you did not expect this email, you can ignore it.
        """,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[instance.email],
        fail_silently=False,
    )
