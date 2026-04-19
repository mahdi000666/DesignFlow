import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/messages';
import type { MessagePayload } from '../types/message';

export const useMessages = (projectId: number) =>
  useQuery({
    queryKey: ['messages', projectId],
    queryFn:  () => api.getMessages(projectId),
  });

export const useReplies = (projectId: number) =>
  useQuery({
    queryKey: ['replies', projectId],
    queryFn:  () => api.getReplies(projectId),
  });

export const useCreateMessage = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessagePayload) => api.sendMessage(payload),
    onSuccess: (data) => {
      // Invalidate the correct cache depending on whether this was a reply or a chat message.
      if (data.feedback != null) {
        qc.invalidateQueries({ queryKey: ['replies', projectId] });
      } else {
        qc.invalidateQueries({ queryKey: ['messages', projectId] });
      }
    },
  });
};