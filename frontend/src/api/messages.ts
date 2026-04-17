import apiClient from './client';
import type { Message, MessagePayload } from '../types/message';

export const getMessages = async (projectId: number): Promise<Message[]> => {
  const { data } = await apiClient.get<{ results: Message[] }>('/messages/', {
    params: { project: projectId },
  });
  return data.results;
};

export const sendMessage = async (payload: MessagePayload): Promise<Message> => {
  const { data } = await apiClient.post<Message>('/messages/', payload);
  return data;
};