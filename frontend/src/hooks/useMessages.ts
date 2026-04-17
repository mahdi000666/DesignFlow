import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/messages';
import type { MessagePayload } from '../types/message';

export const useMessages = (projectId: number) =>
  useQuery({
    queryKey: ['messages', projectId],
    queryFn:  () => api.getMessages(projectId),
  });

export const useCreateMessage = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessagePayload) => api.sendMessage(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['messages', projectId] }),
  });
};