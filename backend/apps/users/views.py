from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone

from apps.users.permissions import IsManager
from apps.users.models import Client, Designer, InvitationToken

from .serializers import ActivateAccountSerializer, CustomTokenObtainPairSerializer


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

    return Response({
        'role':      invitation.user.role,
        'full_name': invitation.user.full_name,
    })


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