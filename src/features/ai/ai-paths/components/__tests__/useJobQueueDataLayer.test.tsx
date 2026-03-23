import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  createListQueryCalls: [] as Array<Record<string, unknown>>,
  fetchAiPathsSettingsByKeysCached: vi.fn(),
  logClientCatch: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  cancelAiPathRun: vi.fn(),
  clearAiPathRuns: vi.fn(),
  getAiPathQueueStatus: vi.fn(),
  listAiPathRuns: vi.fn(),
  removeAiPathRun: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/optimistic-run-queue', () => ({
  mergeAiPathQueuePayloadWithOptimisticRuns: vi.fn((payload) => payload),
  patchQueuedCountWithOptimisticRuns: vi.fn((status) => status),
  previewAiPathQueuePayloadWithOptimisticRuns: vi.fn((payload) => payload),
  rememberOptimisticAiPathRun: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  fetchAiPathsSettingsByKeysCached: mockState.fetchAiPathsSettingsByKeysCached,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: mockState.logClientCatch,
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: vi.fn((options: Record<string, unknown>) => {
    mockState.createListQueryCalls.push(options);
    const resource = (options.meta as { resource?: string } | undefined)?.resource;
    if (resource === 'ai-paths-settings') {
      return {
        data: [],
        error: null,
        isLoading: false,
        refetch: vi.fn(),
      };
    }
    if (resource === 'ai-path-runs-queue-status') {
      return {
        data: { status: { queued: 0, running: 0 } },
        error: null,
        isLoading: false,
        refetch: vi.fn(),
      };
    }
    return {
      data: { runs: [], total: 0 },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    };
  }),
  createMutationV2: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  createDeleteMutationV2: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import { useJobQueueDataLayer } from '../useJobQueueDataLayer';

describe('useJobQueueDataLayer', () => {
  beforeEach(() => {
    mockState.createListQueryCalls = [];
    mockState.fetchAiPathsSettingsByKeysCached.mockReset().mockResolvedValue([]);
    mockState.logClientCatch.mockReset();
  });

  it('only enables the AI Paths settings query when the queue panel is active', () => {
    const baseProps = {
      autoRefreshInterval: 30_000,
      effectiveAutoRefreshEnabled: false,
      isBurstRefreshActive: false,
      markBurstRefresh: vi.fn(),
      optimisticRunsHydrated: true,
      normalizedPathFilter: '',
      normalizedQuery: '',
      normalizedSourceFilter: '',
      normalizedVisibility: 'global' as const,
      offset: 0,
      page: 1,
      pageSize: 25,
      setClearScope: vi.fn(),
      setRunToDelete: vi.fn(),
      sourceMode: 'include' as const,
      statusFilter: 'all',
      toast: vi.fn(),
    };

    const { rerender } = renderHook(
      ({ isPanelActive }: { isPanelActive: boolean }) =>
        useJobQueueDataLayer({
          ...baseProps,
          isPanelActive,
        }),
      { initialProps: { isPanelActive: false } }
    );

    expect(mockState.createListQueryCalls[0]?.enabled).toBe(false);

    mockState.createListQueryCalls = [];
    rerender({ isPanelActive: true });

    expect(mockState.createListQueryCalls[0]?.enabled).toBe(true);
  });

  it('treats lag-threshold settings as best-effort and falls back to defaults on fetch failure', async () => {
    mockState.fetchAiPathsSettingsByKeysCached.mockRejectedValueOnce(new Error('Unauthorized.'));

    renderHook(() =>
      useJobQueueDataLayer({
        autoRefreshInterval: 30_000,
        effectiveAutoRefreshEnabled: false,
        isBurstRefreshActive: false,
        isPanelActive: true,
        markBurstRefresh: vi.fn(),
        optimisticRunsHydrated: true,
        normalizedPathFilter: '',
        normalizedQuery: '',
        normalizedSourceFilter: '',
        normalizedVisibility: 'global',
        offset: 0,
        page: 1,
        pageSize: 25,
        setClearScope: vi.fn(),
        setRunToDelete: vi.fn(),
        sourceMode: 'include',
        statusFilter: 'all',
        toast: vi.fn(),
      })
    );

    const settingsQueryFn = mockState.createListQueryCalls[0]?.queryFn as (() => Promise<unknown>) | undefined;
    await expect(settingsQueryFn?.()).resolves.toEqual([]);
    expect(mockState.fetchAiPathsSettingsByKeysCached).toHaveBeenCalledWith([
      'ai_paths_queue_lag_threshold_ms',
    ]);
    expect(mockState.logClientCatch).toHaveBeenCalledTimes(1);
  });
});
