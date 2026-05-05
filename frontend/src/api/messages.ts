import apiClient from './clients';
import type { Message, MessagePayload } from '../types/message';

export const getMessages = async (projectId: number): Promise<Message[]> => {
  const { data } = await apiClient.get<Message[]>('/messages/', {
    params: { project: projectId },
  });
  return data;
};

export const getAllMessages = async (): Promise<Message[]> => {
  const { data } = await apiClient.get<Message[]>('/messages/', {
    params: { page_size: 100 },
  });
  return data;
};

export const getReplies = async (projectId: number): Promise<Message[]> => {
  const { data } = await apiClient.get<Message[]>('/messages/', {
    params: { project: projectId, replies: 1 },
  });
  return data;
};

export const sendMessage = async (payload: MessagePayload): Promise<Message> => {
  const { data } = await apiClient.post<Message>('/messages/', payload);
  return data;
};

export const markMessagesRead = async (projectId: number): Promise<{ marked: number }> => {
  const { data } = await apiClient.post<{ marked: number }>('/messages/mark-read/', {
    project: projectId,
  });
  return data;
};