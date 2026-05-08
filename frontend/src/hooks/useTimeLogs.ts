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

export const useActiveTimers = () =>
  useQuery({
    queryKey:        ['timers', 'active'],
    queryFn:         api.getActiveTimers,
    refetchInterval: 30_000,   // heartbeat — keeps session state fresh
  });
 
export const useTimerMutations = (projectId: number) => {
  const qc = useQueryClient();
 
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['timers', 'active'] });
    qc.invalidateQueries({ queryKey: ['timelogs', projectId] });
    // Invalidate dashboard all-logs cache so activity feed stays current.
    qc.invalidateQueries({ queryKey: ['timelogs-all'] });
    qc.invalidateQueries({ queryKey: ['projects', projectId] });
  };
 
  const start  = useMutation({ mutationFn: api.startTimer,  onSuccess: invalidate });
  const pause  = useMutation({ mutationFn: api.pauseTimer,  onSuccess: invalidate });
  const resume = useMutation({ mutationFn: api.resumeTimer, onSuccess: invalidate });
  const stop   = useMutation({ mutationFn: api.stopTimer,   onSettled: invalidate });
 
  const isPending = start.isPending || pause.isPending || resume.isPending || stop.isPending;
 
  return { start, pause, resume, stop, isPending };
};
 
export const useActivityLogs = (designerUserId: number | null) =>
  useQuery({
    queryKey: ['activity', designerUserId],
    queryFn:  () => api.getActivityLogs(designerUserId!),
    enabled:  designerUserId != null,
  });
