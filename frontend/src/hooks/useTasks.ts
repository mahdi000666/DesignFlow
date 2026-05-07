import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../api/tasks';
import type { TaskPayload } from '../types/task';

export const useTasks = (projectId: number) =>
  useQuery({
    queryKey: ['tasks', projectId],
    queryFn:  () => tasksApi.getTasks(projectId),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

export const useCreateTask = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
};

export const useUpdateTask = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TaskPayload> }) =>
      tasksApi.updateTask(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
};

export const useDeleteTask = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });
};