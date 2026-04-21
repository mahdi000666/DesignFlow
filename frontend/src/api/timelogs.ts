import apiClient from './clients';
import type { TimeLog, TimeLogPayload } from '../types/timelog';

export const getTimeLogs = async (projectId: number): Promise<TimeLog[]> => {
  const { data } = await apiClient.get<{ results: TimeLog[] }>('/timelogs/', {
    params: { project: projectId },
  });
  return data.results;
};

// All time logs across projects — Manager only. Used by the dashboard.
export const getAllTimeLogs = async (): Promise<TimeLog[]> => {
  const { data } = await apiClient.get<{ results: TimeLog[] }>('/timelogs/', {
    params: { page_size: 100 },
  });
  return data.results;
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