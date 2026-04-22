import apiClient from './clients';
import { getPaginatedResults } from './pagination';
import type { UploadedFile, FileType } from '../types/file';

export const getFiles = async (projectId: number): Promise<UploadedFile[]> => {
  return getPaginatedResults<UploadedFile>('/files/', { project: projectId });
};

// All files across projects — Manager only. Used by the dashboard.
export const getAllFiles = async (): Promise<UploadedFile[]> => {
  return getPaginatedResults<UploadedFile>('/files/', { page_size: 100 });
};

export const uploadFile = async (
  projectId: number,
  fileType: FileType,
  file: File,
): Promise<UploadedFile> => {
  const form = new FormData();
  form.append('project',   String(projectId));
  form.append('file_type', fileType);
  form.append('file',      file);

  // Content-Type is intentionally omitted — Axios sets it automatically with
  // the correct multipart boundary when the body is a FormData instance.
  const { data } = await apiClient.post<UploadedFile>('/files/', form, {
    headers: { 'Content-Type': undefined },
  });
  return data;
};

export const deleteFile = async (id: number): Promise<void> => {
  await apiClient.delete(`/files/${id}/`);
};
