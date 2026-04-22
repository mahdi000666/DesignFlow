import apiClient from './clients';
import { getPaginatedResults } from './pagination';
import type { Task, TaskPayload, HourEstimate } from '../types/task';

export const getTasks = async (projectId: number): Promise<Task[]> => {
  return getPaginatedResults<Task>('/tasks/', { project: projectId });
};

// Completed tasks across all projects — Manager only. Used by the dashboard.
export const getAllCompletedTasks = async (): Promise<Task[]> => {
  return getPaginatedResults<Task>('/tasks/', { status: 'Completed', page_size: 100 });
};

export const createTask = async (payload: TaskPayload): Promise<Task> => {
  const { data } = await apiClient.post<Task>('/tasks/', payload);
  return data;
};

export const updateTask = async (
  id: number,
  payload: Partial<TaskPayload>,
): Promise<Task> => {
  const { data } = await apiClient.patch<Task>(`/tasks/${id}/`, payload);
  return data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await apiClient.delete(`/tasks/${id}/`);
};

export const estimateTaskHours = async (
  taskName: string,
  description: string,
  projectId: number,
): Promise<HourEstimate> => {
  const { data } = await apiClient.post<HourEstimate>('/tasks/estimate-hours/', {
    task_name:   taskName,
    description,
    project_id:  projectId,
  });
  return data;
};
