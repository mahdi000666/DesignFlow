from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from .models import InvitationToken, Designer, Client


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']     = user.email
        token['role']      = user.role
        token['full_name'] = user.full_name
        return token


class ActivateAccountSerializer(serializers.Serializer):
    token    = serializers.CharField()
    password = serializers.CharField(min_length=8, write_only=True)

    # Designer profile fields — ignored for other roles.
    specialization           = serializers.CharField(required=False, allow_blank=True, default='')
    available_hours_per_week = serializers.IntegerField(required=False, allow_null=True, default=None)

    # Client profile fields — ignored for other roles.
    phone    = serializers.CharField(required=False, allow_blank=True, default='')
    industry = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_token(self, value):
        try:
            self._invitation = InvitationToken.objects.select_related('user').get(token=value)
        except InvitationToken.DoesNotExist:
            raise serializers.ValidationError('Invalid token.')
        if self._invitation.is_used:
            raise serializers.ValidationError('This token has already been used.')
        if self._invitation.expires_at < timezone.now():
            raise serializers.ValidationError('This token has expired.')
        return value

    def save(self):
        data       = self.validated_data
        invitation = self._invitation
        user       = invitation.user

        user.set_password(data['password'])
        user.is_active = True
        user.save()
        invitation.is_used = True
        invitation.save()

        # Persist role-specific fields if provided.
        if user.role == 'Designer':
            profile = Designer.objects.get(user=user)
            if data.get('specialization'):
                profile.specialization = data['specialization']
            if data.get('available_hours_per_week') is not None:
                profile.available_hours_per_week = data['available_hours_per_week']
            profile.save()

        elif user.role == 'Client':
            profile = Client.objects.get(user=user)
            if data.get('phone'):
                profile.phone = data['phone']
            if data.get('industry'):
                profile.industry = data['industry']
            profile.save()

        return user