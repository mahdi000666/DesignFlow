import apiClient from './clients';
import type { TeamData, InviteUserPayload, MeData } from '../types/user';

export const getMe = async (): Promise<MeData> => {
  const { data } = await apiClient.get('/users/me/');
  return data;
};

export const updateMe = async (payload: { full_name: string }): Promise<MeData> => {
  const { data } = await apiClient.patch('/users/me/', payload);
  return data;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const { data } = await apiClient.post('/users/change-password/', {
    current_password: currentPassword,
    new_password:     newPassword,
  });
  return data;
};

export const getTeam = async (): Promise<TeamData> => {
  const { data } = await apiClient.get('/users/team/');
  return data;
};

export const inviteUser = async (
  payload: InviteUserPayload,
): Promise<{ message: string }> => {
  const { data } = await apiClient.post('/users/invite/', payload);
  return data;
};

export const uploadAvatar = async (file: File): Promise<MeData> => {
  const form = new FormData();
  form.append('profile_picture', file);
  const { data } = await apiClient.patch('/users/me/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};