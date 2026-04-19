import apiClient from './client';
import type { Message, MessagePayload } from '../types/message';

export const getMessages = async (projectId: number): Promise<Message[]> => {
  const { data } = await apiClient.get<Message[]>('/messages/', {
    params: { project: projectId },
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