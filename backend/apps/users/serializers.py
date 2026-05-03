from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import User, InvitationToken, Designer, Client
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError


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

    specialization           = serializers.CharField(required=False, allow_blank=True, default='')
    available_hours_per_week = serializers.IntegerField(required=False, allow_null=True, default=None)
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


class InviteUserSerializer(serializers.Serializer):
    """
    Used by POST /api/users/invite/ (Manager only).
    Triggers the existing post_save signal which creates the profile row
    and fires the invitation email — no signal changes required.
    """
    email       = serializers.EmailField()
    full_name   = serializers.CharField(max_length=100)
    role        = serializers.ChoiceField(choices=['Designer', 'Client'])
    hourly_rate = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True,
    )

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_full_name(self, value):
        name = value.strip()
        if len(name) < 2:
            raise serializers.ValidationError('Full name must be at least 2 characters.')
        if not any(c.isalpha() for c in name):
            raise serializers.ValidationError('Full name must contain at least one letter.')
        return name

    def validate(self, data):
        if data['role'] == 'Designer' and not data.get('hourly_rate'):
            raise serializers.ValidationError(
                {'hourly_rate': 'Hourly rate is required for Designer accounts.'}
            )
        return data

    def save(self):
        data = self.validated_data
        # create_user saves the User, which fires post_save → profile created + invitation email sent.
        user = User.objects.create_user(
            email=data['email'],
            full_name=data['full_name'],
            role=data['role'],
        )
        if data['role'] == 'Designer' and data.get('hourly_rate'):
            Designer.objects.filter(user=user).update(hourly_rate=data['hourly_rate'])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.lower().strip()
        # EmailField already validates format, but we can double-check
        try:
            validate_email(email)
        except DjangoValidationError:
            raise serializers.ValidationError('Enter a valid email address.')
        return email


class PasswordResetConfirmSerializer(serializers.Serializer):
    token    = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        validate_password(value)   # runs Django's built-in validators
        return value

    def validate(self, data):
        try:
            token_obj = InvitationToken.objects.select_related('user').get(
                token=data['token']
            )
        except InvitationToken.DoesNotExist:
            raise serializers.ValidationError({'token': 'Invalid or expired reset link.'})

        if not token_obj.is_valid():
            raise serializers.ValidationError({'token': 'Invalid or expired reset link.'})

        data['token_obj'] = token_obj
        return data

class UserMeSerializer(serializers.ModelSerializer):
    hourly_rate              = serializers.SerializerMethodField(read_only=True)
    specialization           = serializers.CharField(required=False, allow_blank=True)
    available_hours_per_week = serializers.IntegerField(required=False, allow_null=True)
    phone                    = serializers.CharField(required=False, allow_blank=True)
    industry                 = serializers.CharField(required=False, allow_blank=True)
    avatar_url               = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'full_name', 'role',
            'hourly_rate', 'specialization', 'available_hours_per_week',
            'phone', 'industry', 'avatar_url', 'profile_picture',
        ]
        read_only_fields = ['id', 'email', 'role', 'hourly_rate', 'avatar_url']

    def get_avatar_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url
        return None

    def get_hourly_rate(self, obj):
        if obj.role != 'Designer':
            return None
        try:
            return obj.designer_profile.hourly_rate
        except Designer.DoesNotExist:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['specialization']           = ''
        data['available_hours_per_week'] = None
        data['phone']                    = ''
        data['industry']                 = ''

        if instance.role == 'Designer':
            try:
                profile = instance.designer_profile
                data['specialization']           = profile.specialization
                data['available_hours_per_week'] = profile.available_hours_per_week
            except Designer.DoesNotExist:
                pass
        elif instance.role == 'Client':
            try:
                profile = instance.client_profile
                data['phone']    = profile.phone
                data['industry'] = profile.industry
            except Client.DoesNotExist:
                pass

        return data

    def update(self, instance, validated_data):
        print("VALIDATED DATA:", validated_data)
        instance.full_name = validated_data.get('full_name', instance.full_name)

        if 'profile_picture' in validated_data:
            instance.profile_picture = validated_data['profile_picture']
            
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