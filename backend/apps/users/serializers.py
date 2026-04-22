from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from .models import User, InvitationToken, Designer, Client


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


class UserMeSerializer(serializers.ModelSerializer):
    hourly_rate = serializers.SerializerMethodField(read_only=True)
    specialization = serializers.CharField(required=False, allow_blank=True)
    available_hours_per_week = serializers.IntegerField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    industry = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role',
            'hourly_rate', 'specialization', 'available_hours_per_week',
            'phone', 'industry',
        ]
        read_only_fields = ['id', 'email', 'role', 'hourly_rate']

    def get_hourly_rate(self, obj):
        if obj.role != 'Designer':
            return None
        try:
            return obj.designer_profile.hourly_rate
        except Designer.DoesNotExist:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['specialization'] = ''
        data['available_hours_per_week'] = None
        data['phone'] = ''
        data['industry'] = ''

        if instance.role == 'Designer':
            try:
                profile = instance.designer_profile
                data['specialization'] = profile.specialization
                data['available_hours_per_week'] = profile.available_hours_per_week
            except Designer.DoesNotExist:
                pass
        elif instance.role == 'Client':
            try:
                profile = instance.client_profile
                data['phone'] = profile.phone
                data['industry'] = profile.industry
            except Client.DoesNotExist:
                pass

        return data

    def update(self, instance, validated_data):
        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.save(update_fields=['full_name'])

        if instance.role == 'Designer':
            profile = Designer.objects.get(user=instance)
            if 'specialization' in validated_data:
                profile.specialization = validated_data['specialization']
            if 'available_hours_per_week' in validated_data:
                profile.available_hours_per_week = validated_data['available_hours_per_week']
            profile.save()
        elif instance.role == 'Client':
            profile = Client.objects.get(user=instance)
            if 'phone' in validated_data:
                profile.phone = validated_data['phone']
            if 'industry' in validated_data:
                profile.industry = validated_data['industry']
            profile.save()

        return instance
