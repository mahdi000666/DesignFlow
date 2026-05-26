from django.urls import path
from .views import me, client_list, designer_list, invite_user, team_list, change_password, toggle_user_active

urlpatterns = [
    path('me/',              me,              name='user-me'),
    path('clients/',         client_list,     name='client-list'),
    path('designers/',       designer_list,   name='designer-list'),
    path('invite/',          invite_user,     name='invite-user'),
    path('team/',            team_list,       name='team-list'),
    path('change-password/', change_password, name='change-password'),
    path('<int:pk>/toggle-active/', toggle_user_active, name='toggle-user-active'),
]