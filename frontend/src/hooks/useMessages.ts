import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/messages';
import type { MessagePayload } from '../types/message';
import type { Message } from '../types/message';

export const useMessages = (projectId: number) =>
  useQuery({
    queryKey: ['messages', projectId],
    queryFn:  () => api.getMessages(projectId),
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
  });

export const useReplies = (projectId: number) =>
  useQuery({
    queryKey: ['replies', projectId],
    queryFn:  () => api.getReplies(projectId),
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
  });

export const useCreateMessage = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessagePayload) => api.sendMessage(payload),
    onSuccess: (data) => {
      if (data.feedback != null) {
        qc.invalidateQueries({ queryKey: ['replies', projectId] });
      } else {
        qc.invalidateQueries({ queryKey: ['messages', projectId] });
      }
    },
  });
};

export const useMarkMessagesRead = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markMessagesRead(projectId),
    onSuccess: () => {
      // Flip is_read in the cached array directly — no refetch, no cascade.
      qc.setQueryData<Message[]>(['messages', projectId], (old = []) =>
        old.map(m => ({ ...m, is_read: true })),
      );
      // Only invalidate the dashboard KPI query.
      qc.invalidateQueries({ queryKey: ['messages-all'] });
    },
  });
};