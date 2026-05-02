import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/files';
import type { FileType } from '../types/file';

export const useFiles = (projectId: number) =>
  useQuery({
    queryKey: ['files', projectId],
    queryFn:  () => api.getFiles(projectId),
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
  });

export const useUploadFile = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileType, file }: { fileType: FileType; file: File }) =>
      api.uploadFile(projectId, fileType, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', projectId] }),
  });
};

export const useDeleteFile = (projectId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteFile,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['files', projectId] }),
  });
};