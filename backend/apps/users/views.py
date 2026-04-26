from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum

from apps.users.permissions import IsManager
from apps.users.models import Client, Designer, InvitationToken, User
from apps.timelog.models import TimeLog

from .serializers import (
    ActivateAccountSerializer,
    CustomTokenObtainPairSerializer,
    InviteUserSerializer,
    UserMeSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def get_activation_info(request):
    """
GET /api/auth/activate-info/?token=<uuid>

Returns the role and full_name associated with a valid, unused token.
The frontend uses this to decide which profile fields to render on the
activation page — without consuming the token or requiring login.
"""
    token_value = request.query_params.get('token', '')
    if not token_value:
        return Response({'detail': 'token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invitation = InvitationToken.objects.select_related('user').get(token=token_value)
    except InvitationToken.DoesNotExist:
        return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

    if invitation.is_used:
        return Response({'detail': 'This token has already been used.'}, status=status.HTTP_400_BAD_REQUEST)
    if invitation.expires_at < timezone.now():
        return Response({'detail': 'This token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'role': invitation.user.role, 'full_name': invitation.user.full_name})


@api_view(['POST'])
@permission_classes([AllowAny])
def activate_account(request):
    """
POST /api/auth/activate/

Validates the token, sets the password, activates the account, and
optionally saves role-specific profile fields in the same request.
"""
    serializer = ActivateAccountSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    return Response(
        {'message': f'Account activated. Welcome {user.full_name}, you can now log in.'},
        status=status.HTTP_200_OK,
    )


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'GET':
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)

    serializer = UserMeSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """POST /api/users/change-password/"""
    current = request.data.get('current_password', '')
    new_pwd = request.data.get('new_password', '')

    if not current or not new_pwd:
        return Response(
            {'detail': 'Both current_password and new_password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not request.user.check_password(current):
        return Response(
            {'detail': 'Current password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(new_pwd) < 8:
        return Response(
            {'detail': 'New password must be at least 8 characters.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.set_password(new_pwd)
    request.user.save(update_fields=['password'])
    return Response({'message': 'Password updated successfully.'})


@api_view(['POST'])
@permission_classes([IsManager])
def invite_user(request):
    """POST /api/users/invite/ — Manager invites a new Designer or Client."""
    serializer = InviteUserSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({'message': 'Invitation sent successfully.'}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsManager])
def team_list(request):
    """
    GET /api/users/team/

    Returns:
      - designers: list of Designer cards with this-week utilisation + active projects
      - users:     flat list of all users for the All Users table
    """
    today      = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())  # Monday of current week

    designers = (
        Designer.objects
        .select_related('user')
        .prefetch_related('assignments__project')
        .all()
    )

    designer_data = []
    for d in designers:
        weekly_hours = float(
            TimeLog.objects
            .filter(designer=d, created_at__date__gte=week_start)
            .aggregate(total=Sum('hours_spent'))['total'] or 0
        )

        active_projects = [
            a.project.project_name
            for a in d.assignments.all()
            if a.project.status == 'Active'
        ]

        util_pct = (
            round(weekly_hours / d.available_hours_per_week * 100, 1)
            if d.available_hours_per_week else None
        )

        designer_data.append({
            'designer_id':              d.id,
            'designer_name':            d.user.full_name,
            'specialization':           d.specialization,
            'hourly_rate':              str(d.hourly_rate) if d.hourly_rate else None,
            'available_hours_per_week': d.available_hours_per_week,
            'logged_hours_this_week':   weekly_hours,
            'utilization_pct':          util_pct,
            'active_projects':          active_projects,
            'is_active':                d.user.is_active,
        })

    all_users = (
        User.objects
        .select_related('designer_profile', 'client_profile')
        .order_by('role', 'full_name')
    )

    user_data = []
    for u in all_users:
        spec = ''
        if u.role == 'Designer':
            try:
                spec = u.designer_profile.specialization
            except Designer.DoesNotExist:
                pass
        elif u.role == 'Client':
            try:
                spec = u.client_profile.industry
            except Client.DoesNotExist:
                pass

        user_data.append({
            'id':             u.id,
            'full_name':      u.full_name,
            'email':          u.email,
            'role':           u.role,
            'specialization': spec,
            'is_active':      u.is_active,
        })

    return Response({'designers': designer_data, 'users': user_data})


@api_view(['GET'])
@permission_classes([IsManager])
def client_list(request):
    clients = Client.objects.select_related('user').all()
    return Response([{'id': c.id, 'name': c.user.full_name} for c in clients])


@api_view(['GET'])
@permission_classes([IsManager])
def designer_list(request):
    designers = Designer.objects.select_related('user').all()
    return Response([{'id': d.id, 'name': d.user.full_name} for d in designers])