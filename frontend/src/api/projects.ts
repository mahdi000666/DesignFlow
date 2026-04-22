import apiClient from './clients';
import { getPaginatedResults } from './pagination';
import type { Project, ProjectPayload } from '../types/project';

export const getProjects = async (): Promise<Project[]> => {
  return getPaginatedResults<Project>('/projects/');
};

export const getProject = async (id: number): Promise<Project> => {
  const { data } = await apiClient.get<Project>(`/projects/${id}/`);
  return data;
};

export const createProject = async (payload: ProjectPayload): Promise<Project> => {
  const { data } = await apiClient.post<Project>('/projects/', payload);
  return data;
};

export const updateProject = async (
  id: number,
  payload: Partial<ProjectPayload>,
): Promise<Project> => {
  const { data } = await apiClient.patch<Project>(`/projects/${id}/`, payload);
  return data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await apiClient.delete(`/projects/${id}/`);
};

export const assignDesigner = async (
  projectId: number,
  designerId: number,
): Promise<void> => {
  await apiClient.post(`/projects/${projectId}/assign/`, { designer_id: designerId });
};

export const removeDesigner = async (projectId: number, designerId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/assign/${designerId}/`);
};
