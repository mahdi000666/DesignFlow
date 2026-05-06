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
    // Cancel any in-flight GET before POSTing — prevents a stale poll
    // response arriving after onSuccess from overwriting is_read=true.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['messages', projectId] });
    },
    mutationFn: () => api.markMessagesRead(projectId),
    onSuccess: () => {
      // Optimistic update — immediate badge clear.
      qc.setQueryData<Message[]>(['messages', projectId], (old = []) =>
        old.map(m => ({ ...m, is_read: true })),
      );
      // Invalidate both to get confirmed server state.
      qc.invalidateQueries({ queryKey: ['messages', projectId] });
      qc.invalidateQueries({ queryKey: ['messages-all'] });
    },
  });
};