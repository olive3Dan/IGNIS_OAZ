import apiClient from './client';
import type { FeatureResponse, FeatureRequest } from '../types/feature';

export async function fetchFeatures(bbox?: string): Promise<FeatureResponse[]> {
  const params = bbox ? { bbox } : undefined;
  const res = await apiClient.get<FeatureResponse[]>('/features', { params });
  return res.data;
}

export async function fetchFeatureById(id: string): Promise<FeatureResponse> {
  const res = await apiClient.get<FeatureResponse>(`/features/${id}`);
  return res.data;
}

export async function createFeature(feature: FeatureRequest): Promise<FeatureResponse> {
  const res = await apiClient.post<FeatureResponse>('/features', feature);
  return res.data;
}

export async function updateFeature(id: string, feature: FeatureRequest): Promise<FeatureResponse> {
  const res = await apiClient.put<FeatureResponse>(`/features/${id}`, feature);
  return res.data;
}

export async function deleteFeature(id: string): Promise<void> {
  await apiClient.delete(`/features/${id}`);
}
