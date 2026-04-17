from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/',         admin.site.urls),
    path('api/auth/',      include('apps.users.urls')),
    path('api/users/',     include('apps.users.urls_users')),
    path('api/projects/',  include('apps.projects.urls')),
    path('api/tasks/',     include('apps.tasks.urls')),
    path('api/timelogs/',  include('apps.timelog.urls')),
    path('api/feedback/',  include('apps.feedback.urls')),
    path('api/files/',     include('apps.files.urls')),
    path('api/messages/',  include('apps.messages.urls')),
    path('api/analytics/', include('apps.analytics.urls'))
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)