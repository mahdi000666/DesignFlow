from django.urls import path
from .views import (
    KPISummaryView,
    BudgetVarianceView,
    EHRView,
    ClientProfitabilityView,
    ScopeCreepView,
    DesignerUtilizationView,
    CumulativeHoursView,
    RevenueByClientView,
    ProfitMarginView,
    AISummaryView,
)

urlpatterns = [
    path('kpi-summary/',           KPISummaryView.as_view()),
    path('budget-variance/',       BudgetVarianceView.as_view()),
    path('ehr/',                   EHRView.as_view()),
    path('profitability/',         ClientProfitabilityView.as_view()),
    path('scope-creep/',           ScopeCreepView.as_view()),
    path('designer-utilization/',  DesignerUtilizationView.as_view()),
    path('cumulative-hours/',      CumulativeHoursView.as_view()),
    path('revenue-by-client/',     RevenueByClientView.as_view()),
    path('profit-margin/',         ProfitMarginView.as_view()),
    path('ai-summary/',            AISummaryView.as_view()),
]