import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/feedbacks';
import type { FeedbackPayload, FeedbackStatus } from '../types/feedback';

export const useFeedback = (projectId: number) =>
  useQuery({
    queryKey: ['feedback', projectId],
    queryFn:  () => api.getFeedback(projectId),
  });

export const useCreateFeedback = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FeedbackPayload) => api.createFeedback(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['feedback', projectId] }),
  });
};

export const useUpdateFeedbackStatus = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: FeedbackStatus }) =>
      api.updateFeedbackStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback', projectId] }),
  });
};

export const useDeleteFeedback = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteFeedback(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['feedback', projectId] }),
  });
};