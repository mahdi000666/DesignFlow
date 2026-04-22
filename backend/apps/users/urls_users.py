from django.urls import path
from .views import me, client_list, designer_list

urlpatterns = [
    path('me/',        me,            name='user-me'),
    path('clients/',   client_list,   name='client-list'),
    path('designers/', designer_list, name='designer-list'),
]
