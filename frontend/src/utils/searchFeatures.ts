import type { FeatureResponse } from '../types/feature';

const MAX_RESULTS = 10;

/**
 * Searches features by name or featureType using case-insensitive substring match.
 * Returns at most 10 results. Requires minimum 2 characters.
 */
export function searchFeatures(features: FeatureResponse[], query: string): FeatureResponse[] {
  if (query.length < 2) return [];
  const lower = query.toLowerCase();
  const results: FeatureResponse[] = [];

  for (const f of features) {
    if (results.length >= MAX_RESULTS) break;
    if (f.name.toLowerCase().includes(lower) || f.featureType.toLowerCase().includes(lower)) {
      results.push(f);
    }
  }

  return results;
}
