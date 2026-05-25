import { useState, useEffect, useCallback } from 'react';
import type { FeatureResponse } from '../types/feature';
import { fetchFeatures } from '../api/features';

export function useFeatures() {
  const [features, setFeatures] = useState<FeatureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (bbox?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFeatures(bbox);
      setFeatures(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { features, loading, error, reload: load };
}
