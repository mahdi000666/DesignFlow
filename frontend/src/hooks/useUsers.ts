import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, updateMe, changePassword, getTeam, inviteUser } from '../api/users';
import type { InviteUserPayload } from '../types/user';

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn:  getMe,
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      changePassword(current, next),
  });

export const useTeam = () =>
  useQuery({
    queryKey: ['team'],
    queryFn:  getTeam,
  });

export const useInviteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteUserPayload) => inviteUser(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
};