import apiClient from './clients';
import type {
  KPISummary,
  BudgetVarianceItem,
  EHRItem,
  ClientProfitabilityItem,
  ScopeCreepItem,
  DesignerUtilizationItem,
  CumulativeHoursPoint,
  RevenueByClientItem,
  ProfitMarginItem,
  AISummaryResponse,
  AnalyticsFilters,
} from '../types/analytic';

function toParams(filters: AnalyticsFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.date_from)  out.date_from = filters.date_from;
  if (filters.date_to)    out.date_to   = filters.date_to;
  if (filters.client)     out.client    = String(filters.client);
  if (filters.project)    out.project   = String(filters.project);
  return out;
}

export const getKPISummary = async (filters: AnalyticsFilters = {}): Promise<KPISummary> => {
  const { data } = await apiClient.get('/analytics/kpi-summary/', { params: toParams(filters) });
  return data;
};

export const getBudgetVariance = async (filters: AnalyticsFilters = {}): Promise<BudgetVarianceItem[]> => {
  const { data } = await apiClient.get('/analytics/budget-variance/', { params: toParams(filters) });
  return data;
};

export const getEHR = async (filters: AnalyticsFilters = {}): Promise<EHRItem[]> => {
  const { data } = await apiClient.get('/analytics/ehr/', { params: toParams(filters) });
  return data;
};

export const getClientProfitability = async (
  filters: AnalyticsFilters = {},
): Promise<ClientProfitabilityItem[]> => {
  const { data } = await apiClient.get('/analytics/profitability/', { params: toParams(filters) });
  return data;
};

export const getScopeCreep = async (filters: AnalyticsFilters = {}): Promise<ScopeCreepItem[]> => {
  const { data } = await apiClient.get('/analytics/scope-creep/', { params: toParams(filters) });
  return data;
};

export const getDesignerUtilization = async (filters: AnalyticsFilters = {}): Promise<DesignerUtilizationItem[]> => {
  const { data } = await apiClient.get('/analytics/designer-utilization/', { params: toParams(filters) });
  return data;
};

export const getCumulativeHours = async (filters: AnalyticsFilters): Promise<CumulativeHoursPoint[]> => {
  const { data } = await apiClient.get('/analytics/cumulative-hours/', { params: toParams(filters) });
  return data;
};

export const getRevenueByClient = async (
  filters: AnalyticsFilters = {},
): Promise<RevenueByClientItem[]> => {
  const { data } = await apiClient.get('/analytics/revenue-by-client/', { params: toParams(filters) });
  return data;
};

export const getProfitMargin = async (filters: AnalyticsFilters = {}): Promise<ProfitMarginItem[]> => {
  const { data } = await apiClient.get('/analytics/profit-margin/', { params: toParams(filters) });
  return data;
};

export const getAISummary = async (projectId: number): Promise<AISummaryResponse> => {
  const { data } = await apiClient.get('/analytics/ai-summary/', { params: { project: projectId } });
  return data;
};

// ---------------------------------------------------------------------------
// Export helpers — fetch blob with auth token, trigger browser download
// ---------------------------------------------------------------------------

async function downloadBlob(url: string, filename: string) {
  const token = localStorage.getItem('access_token');
  const resp  = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Export failed');
  const blob    = await resp.blob();
  const href    = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  anchor.href   = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

export const exportPDF = (projectId: number) =>
  downloadBlob(`/reports/export/?format=pdf&project=${projectId}`, `project_${projectId}_report.pdf`);

export const exportExcel = (projectId?: number) => {
  const qs = projectId ? `?format=excel&project=${projectId}` : '?format=excel';
  return downloadBlob(`/reports/export/${qs}`, 'profitability_report.xlsx');
};
