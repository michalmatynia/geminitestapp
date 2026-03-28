import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

import { fetchBrainInsightsSnapshot } from '../hooks/useBrainQueries';

describe('fetchBrainInsightsSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-fails runtime insights while keeping analytics/logs payloads', async () => {
    apiGetMock
      .mockRejectedValueOnce(new Error('forbidden'))
      .mockResolvedValueOnce({ insights: [{ id: 'analytics-1' }] })
      .mockResolvedValueOnce({ insights: [{ id: 'logs-1' }] });

    const snapshot = await fetchBrainInsightsSnapshot();

    expect(apiGetMock).toHaveBeenNthCalledWith(
      1,
      '/api/ai-paths/runtime-analytics/insights',
      expect.objectContaining({ params: { limit: 5 } })
    );
    expect(apiGetMock).toHaveBeenNthCalledWith(
      2,
      '/api/analytics/insights',
      expect.objectContaining({ params: { limit: 5 } })
    );
    expect(apiGetMock).toHaveBeenNthCalledWith(
      3,
      '/api/system/logs/insights',
      expect.objectContaining({ params: { limit: 5 } })
    );
    expect(snapshot.analytics).toHaveLength(1);
    expect(snapshot.logs).toHaveLength(1);
    expect(snapshot.runtimeAnalytics).toEqual([]);
  });

  it('throws when analytics insight fetch fails', async () => {
    apiGetMock
      .mockResolvedValueOnce({ insights: [{ id: 'runtime-1' }] })
      .mockRejectedValueOnce(new Error('analytics failed'))
      .mockResolvedValueOnce({ insights: [{ id: 'logs-1' }] });

    await expect(fetchBrainInsightsSnapshot()).rejects.toThrow('analytics failed');
  });

  it('throws when logs insight fetch fails', async () => {
    apiGetMock
      .mockResolvedValueOnce({ insights: [{ id: 'runtime-1' }] })
      .mockResolvedValueOnce({ insights: [{ id: 'analytics-1' }] })
      .mockRejectedValueOnce(new Error('logs failed'));

    await expect(fetchBrainInsightsSnapshot()).rejects.toThrow('logs failed');
  });
});
