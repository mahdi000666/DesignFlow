from django.urls import path
from .report_views import ExportView

urlpatterns = [
    path('export/', ExportView.as_view()),
]