import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/timelogs';
import type { TimeLogPayload } from '../types/timelog';

export const useTimeLogs = (projectId: number) =>
  useQuery({
    queryKey: ['timelogs', projectId],
    queryFn:  () => api.getTimeLogs(projectId),
  });

export const useCreateTimeLog = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTimeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timelogs', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'], exact: true });
    },
  });
};

export const useDeleteTimeLog = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTimeLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timelogs', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'], exact: true });
    },
  });
};

export const useUpdateTimeLog = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TimeLogPayload> }) =>
      api.updateTimeLog(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timelogs', projectId] }),
  });
};