import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFeatures } from './useFeatures';

// Mock the API module
vi.mock('../api/features', () => ({
  fetchFeatures: vi.fn(),
}));

import { fetchFeatures } from '../api/features';
const mockFetchFeatures = vi.mocked(fetchFeatures);

describe('useFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega features ao montar', async () => {
    const mockData = [
      {
        id: '123',
        name: 'Test Feature',
        featureType: 'area_ardida',
        geom: { type: 'Point', coordinates: [-7.6, 40.3, 100] },
      },
    ];
    mockFetchFeatures.mockResolvedValue(mockData);

    const { result } = renderHook(() => useFeatures());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.features).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockFetchFeatures).toHaveBeenCalledTimes(1);
  });

  it('reporta erro quando API falha', async () => {
    mockFetchFeatures.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFeatures());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.features).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('reload carrega novamente', async () => {
    mockFetchFeatures.mockResolvedValue([]);

    const { result } = renderHook(() => useFeatures());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetchFeatures.mockResolvedValue([
      { id: '456', name: 'New', featureType: 'teste', geom: { type: 'Point', coordinates: [0, 0, 0] } },
    ]);

    result.current.reload();

    await waitFor(() => {
      expect(result.current.features).toHaveLength(1);
    });

    expect(mockFetchFeatures).toHaveBeenCalledTimes(2);
  });
});
