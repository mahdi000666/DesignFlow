import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/timelogs';
import type { TimeLogPayload } from '../types/timelog';

export const useTimeLogs = (projectId: number) =>
  useQuery({
    queryKey: ['timelogs', projectId],
    queryFn:  () => api.getTimeLogs(projectId),
  });

// Invalidates every query whose key starts with ['timelogs'] — covers both
// the per-project cache ['timelogs', projectId] and the dashboard's
// all-logs cache ['timelogs', 'all'].
function invalidateTimelogs(qc: ReturnType<typeof useQueryClient>, projectId: number) {
  qc.invalidateQueries({ queryKey: ['timelogs'] });
  qc.invalidateQueries({ queryKey: ['projects', projectId] });
  qc.invalidateQueries({ queryKey: ['projects'], exact: true });
}

export const useCreateTimeLog = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTimeLog,
    onSuccess: () => invalidateTimelogs(qc, projectId),
  });
};

export const useDeleteTimeLog = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTimeLog,
    onSuccess: () => invalidateTimelogs(qc, projectId),
  });
};

export const useUpdateTimeLog = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TimeLogPayload> }) =>
      api.updateTimeLog(id, payload),
    onSuccess: () => invalidateTimelogs(qc, projectId),
  });
};