from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    TimeLogViewSet,
    active_timers, timer_start, timer_pause, timer_resume, timer_stop,
    activity_logs,
)

router = DefaultRouter()
router.register(r'', TimeLogViewSet, basename='timelog')

urlpatterns = [
    # Timer actions — must come before router.urls to avoid pk pattern conflicts.
    path('timer/active/',  active_timers, name='timer-active'),
    path('timer/start/',   timer_start,   name='timer-start'),
    path('timer/pause/',   timer_pause,   name='timer-pause'),
    path('timer/resume/',  timer_resume,  name='timer-resume'),
    path('timer/stop/',    timer_stop,    name='timer-stop'),
    path('activity/',      activity_logs, name='activity-logs'),
    *router.urls,
]