import apiClient from './client';
import type { AttachmentResponse } from '../types/feature';

export async function fetchAttachments(featureId: string): Promise<AttachmentResponse[]> {
  const res = await apiClient.get<AttachmentResponse[]>(`/features/${featureId}/attachments`);
  return res.data;
}

export async function uploadAttachment(featureId: string, file: File): Promise<AttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post<AttachmentResponse>(`/features/${featureId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteAttachment(featureId: string, attachmentId: string): Promise<void> {
  await apiClient.delete(`/features/${featureId}/attachments/${attachmentId}`);
}

export function getAttachmentDownloadUrl(attachmentId: string): string {
  return `/api/attachments/${attachmentId}/download`;
}
