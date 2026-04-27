from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, PasswordResetConfirmView, PasswordResetRequestView,
    activate_account, get_activation_info, get_password_reset_info,
)

urlpatterns = [
    path('token/',                  CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/',          TokenRefreshView.as_view(),          name='token_refresh'),
    path('activate/',               activate_account,                    name='activate_account'),
    path('activate-info/',          get_activation_info,                 name='activate_info'),
    path('password-reset/',         PasswordResetRequestView.as_view(),  name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(),  name='password-reset-confirm'),
    path('password-reset-info/',    get_password_reset_info,             name='password-reset-info'),
]