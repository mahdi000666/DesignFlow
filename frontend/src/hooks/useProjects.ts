import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '../api/projects';
import type { ProjectPayload } from '../types/project';

export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectsApi.getProjects });

export const useProject = (id: number) =>
  useQuery({ queryKey: ['projects', id], queryFn: () => projectsApi.getProject(id) });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['projects'], exact: true });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useUpdateProject = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProjectPayload>) => projectsApi.updateProject(id, payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['projects', id] });
      qc.invalidateQueries({ queryKey: ['projects'], exact: true });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: (_, deletedId) => {
      // Invalidate the list but remove the detail entry — don't trigger a
      // 404 refetch on the now-deleted project while the page is still mounted.
      qc.invalidateQueries({ queryKey: ['projects'], exact: true });
      qc.removeQueries({ queryKey: ['projects', deletedId] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useAssignDesigner = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (designerId: number) => projectsApi.assignDesigner(projectId, designerId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'], exact: true });
    },
  });
};

export const useRemoveDesigner = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (designerId: number) => projectsApi.removeDesigner(projectId, designerId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'], exact: true });
    },
  });
};
