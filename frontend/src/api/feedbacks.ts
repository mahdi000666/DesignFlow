import apiClient from './clients';
import { getPaginatedResults } from './pagination';
import type { Feedback, FeedbackPayload, FeedbackStatus } from '../types/feedback';

export const getFeedback = async (projectId: number): Promise<Feedback[]> => {
  return getPaginatedResults<Feedback>('/feedback/', { project: projectId });
};

// All feedback across projects — Manager only. Used by the dashboard.
export const getAllFeedback = async (): Promise<Feedback[]> => {
  return getPaginatedResults<Feedback>('/feedback/', { page_size: 100 });
};

export const createFeedback = async (payload: FeedbackPayload): Promise<Feedback> => {
  const { data } = await apiClient.post<Feedback>('/feedback/', payload);
  return data;
};

export const updateFeedbackStatus = async (
  id: number,
  status: FeedbackStatus,
): Promise<Feedback> => {
  const { data } = await apiClient.patch<Feedback>(`/feedback/${id}/`, { status });
  return data;
};

export const deleteFeedback = async (id: number): Promise<void> => {
  await apiClient.delete(`/feedback/${id}/`);
};
