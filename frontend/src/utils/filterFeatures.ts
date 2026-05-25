import type { FeatureResponse } from '../types/feature';

/**
 * Filters features by name using case-insensitive substring match.
 */
export function filterFeatures(features: FeatureResponse[], query: string): FeatureResponse[] {
  if (!query.trim()) return features;
  const lower = query.toLowerCase();
  return features.filter((f) => f.name.toLowerCase().includes(lower));
}
