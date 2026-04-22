import { useQuery } from '@tanstack/react-query';
import {
  getKPISummary,
  getBudgetVariance,
  getEHR,
  getClientProfitability,
  getScopeCreep,
  getDesignerUtilization,
  getCumulativeHours,
  getRevenueByClient,
  getProfitMargin,
  getAISummary,
} from '../api/analytics';
import type { AnalyticsFilters } from '../types/analytic';

export const useKPISummary = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ['analytics', 'kpi', filters],
    queryFn:  () => getKPISummary(filters),
  });

export const useBudgetVariance = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ['analytics', 'budget-variance', filters],
    queryFn:  () => getBudgetVariance(filters),
  });

export const useEHR = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ['analytics', 'ehr', filters],
    queryFn:  () => getEHR(filters),
  });

export const useClientProfitability = () =>
  useQuery({
    queryKey: ['analytics', 'profitability'],
    queryFn:  getClientProfitability,
  });

export const useScopeCreep = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ['analytics', 'scope-creep', filters],
    queryFn:  () => getScopeCreep(filters),
  });

export const useDesignerUtilization = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ['analytics', 'designer-utilization', filters],
    queryFn:  () => getDesignerUtilization(filters),
  });

export const useCumulativeHours = (filters: AnalyticsFilters) =>
  useQuery({
    queryKey: ['analytics', 'cumulative-hours', filters],
    queryFn:  () => getCumulativeHours(filters),
    enabled:  !!filters.project,
  });

export const useRevenueByClient = () =>
  useQuery({
    queryKey: ['analytics', 'revenue-by-client'],
    queryFn:  getRevenueByClient,
  });

export const useProfitMargin = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ['analytics', 'profit-margin', filters],
    queryFn:  () => getProfitMargin(filters),
  });

export const useAISummary = (projectId: number | undefined) =>
  useQuery({
    queryKey: ['analytics', 'ai-summary', projectId],
    queryFn:  () => getAISummary(projectId!),
    enabled:  false,           // ← changed: manual trigger only
    staleTime: 5 * 60 * 1000,
  });