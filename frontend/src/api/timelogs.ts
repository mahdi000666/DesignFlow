import apiClient from './clients';
import { getPaginatedResults } from './pagination';
import type { ActivityLog, TimeLog, TimeLogPayload, TimerSession } from '../types/timelog';

export const getTimeLogs = async (projectId: number): Promise<TimeLog[]> => {
  return getPaginatedResults<TimeLog>('/timelogs/', { project: projectId });
};

// All time logs across projects — Manager only. Used by the dashboard.
export const getAllTimeLogs = async (): Promise<TimeLog[]> => {
  return getPaginatedResults<TimeLog>('/timelogs/', { page_size: 100 });
};

export const createTimeLog = async (payload: TimeLogPayload): Promise<TimeLog> => {
  const { data } = await apiClient.post<TimeLog>('/timelogs/', payload);
  return data;
};

export const updateTimeLog = async (
  id: number,
  payload: Partial<TimeLogPayload>,
): Promise<TimeLog> => {
  const { data } = await apiClient.patch<TimeLog>(`/timelogs/${id}/`, payload);
  return data;
};

export const deleteTimeLog = async (id: number): Promise<void> => {
  await apiClient.delete(`/timelogs/${id}/`);
};

export const getActiveTimers = async (): Promise<TimerSession[]> => {
  const { data } = await apiClient.get<TimerSession[]>('/timelogs/timer/active/');
  return data;
};
 
export const startTimer = async (taskId: number): Promise<TimerSession> => {
  const { data } = await apiClient.post<TimerSession>('/timelogs/timer/start/', { task_id: taskId });
  return data;
};
 
export const pauseTimer = async (taskId: number): Promise<TimerSession> => {
  const { data } = await apiClient.post<TimerSession>('/timelogs/timer/pause/', { task_id: taskId });
  return data;
};
 
export const resumeTimer = async (taskId: number): Promise<TimerSession> => {
  const { data } = await apiClient.post<TimerSession>('/timelogs/timer/resume/', { task_id: taskId });
  return data;
};
 
export const stopTimer = async (taskId: number): Promise<TimeLog> => {
  const { data } = await apiClient.post<TimeLog>('/timelogs/timer/stop/', { task_id: taskId });
  return data;
};
 
export const getActivityLogs = async (designerUserId: number): Promise<ActivityLog[]> => {
  const { data } = await apiClient.get<ActivityLog[]>('/timelogs/activity/', {
    params: { designer_user_id: designerUserId },
  });
  return data;
};
