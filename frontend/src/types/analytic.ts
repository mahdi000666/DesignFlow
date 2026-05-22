export interface KPISummary {
  total_revenue:    number;
  avg_ehr:          number;
  active_projects:  number;
  pending_feedback: number;
}

export interface BudgetVarianceItem {
  project_id:       number;
  project_name:     string;
  budget_hours:     number;
  estimated_hours:  number;
  actual_hours:     number;
  variance_pct:     number | null;
}

export interface EHRItem {
  project_id:    number;
  project_name:  string;
  budget_amount: number;
  actual_hours:  number;
  ehr:           number | null;
}

export interface ClientProfitabilityItem {
  client_id:      number;
  client_name:    string;
  total_revenue:  number;
  total_hours:    number;
  ehr:            number | null;
  revision_count: number;
}

export interface ScopeCreepItem {
  project_id:        number;
  project_name:      string;
  total_tasks:       number;
  unplanned_tasks:   number;
  scope_creep_index: number;
}

export interface DesignerUtilizationItem {
  designer_id:              number;
  designer_user_id:              number;
  designer_name:            string;
  logged_hours:             number;
  available_hours_per_week: number | null;
  utilization_pct:          number | null;
}

export interface CumulativeHoursPoint {
  date:             string;
  cumulative_hours: number;
}

export interface RevenueByClientItem {
  client_name:   string;
  total_revenue: number;
}

export interface ProfitMarginItem {
  project_id: number;
  project_name: string;
  status: 'Active' | 'Completed' | 'OnHold';
  budget_amount: number;
  budget_hours: number;
  ehr: number;
  actual_hours: number;
  avg_designer_rate: number | null;
  profit_margin_pct: number | null;
  target_ehr: number | null;        // NEW
  margin_at_budget: number | null;  // NEW
  projected_margin: number | null;  // NEW
}

export interface AISummaryResponse {
  summary: string;
}

export interface AnalyticsFilters {
  date_from?:  string;   // ISO date yyyy-mm-dd
  date_to?:    string;
  client?:     number;
  project?:    number;
}