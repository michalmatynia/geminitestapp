// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { QueryProvider } from '@/shared/providers/QueryProvider';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const useQueryPersistenceMock = vi.fn(() => ({ clearPersisted: vi.fn() }));
const setupOfflineSupportMock = vi.fn();

vi.mock('@/shared/hooks/query/useQueryPersistence', () => ({
  useQueryPersistence: (config: unknown) => useQueryPersistenceMock(config),
}));

vi.mock('@/shared/hooks/query/useQueryBatching', () => ({
  useQueryBatching: () => undefined,
}));

vi.mock('@/shared/hooks/query/useQueryErrorHandling', () => ({
  useGlobalQueryErrorHandler: () => undefined,
}));

vi.mock('@/shared/hooks/query/useQueryLifecycle', () => ({
  useQueryLifecycle: () => ({
    cleanupStaleQueries: () => undefined,
    optimizeQueryPriorities: () => undefined,
  }),
}));

vi.mock('@/shared/hooks/query/useQueryMiddleware', () => ({
  useQueryMiddleware: () => undefined,
  developmentMiddlewares: [],
  productionMiddlewares: [],
}));

vi.mock('@/shared/hooks/query/useSmartCache', () => ({
  useSmartCache: () => ({
    optimizeCache: () => undefined,
    getCacheStats: () => ({
      totalQueries: 0,
      activeQueries: 0,
      staleQueries: 0,
      errorQueries: 0,
      totalSize: 0,
      avgSize: 0,
    }),
    preloadCriticalData: async () => undefined,
  }),
  useCacheWarming: () => ({
    warmUserSpecificData: async () => undefined,
    warmNavigationData: async () => undefined,
    warmFrequentlyAccessedData: async () => undefined,
  }),
}));

vi.mock('@/shared/hooks/useQueryAnalytics', () => ({
  usePerformanceMonitor: () => undefined,
}));

vi.mock('@/shared/lib/offline-support', () => ({
  setupOfflineSupport: (...args: unknown[]) => setupOfflineSupportMock(...args),
}));

describe('QueryProvider', () => {
  beforeEach(() => {
    useQueryPersistenceMock.mockClear();
    setupOfflineSupportMock.mockClear();
  });

  it('does not force lite settings revalidation on load when persistence restores cached data', async () => {
    render(
      <QueryProvider>
        <div>query-provider-child</div>
      </QueryProvider>
    );

    expect(screen.getByText('query-provider-child')).toBeInTheDocument();

    // Persistence is deferred via requestIdleCallback / setTimeout(1ms) —
    // flush the microtask queue so the deferred callback fires.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const settingsPersistenceCall = useQueryPersistenceMock.mock.calls.find(
      ([config]) =>
        JSON.stringify((config as { queryKeys?: unknown[] }).queryKeys) ===
        JSON.stringify([[...QUERY_KEYS.settings.scope('lite')]])
    );

    expect(settingsPersistenceCall).toBeTruthy();
    expect(settingsPersistenceCall?.[0]).toMatchObject({
      key: 'app-queries',
      queryKeys: [[...QUERY_KEYS.settings.scope('lite')]],
      ttl: 1000 * 60 * 60,
      maxItemBytes: 16 * 1024,
    });
    expect(
      (settingsPersistenceCall?.[0] as { revalidateOnLoad?: boolean } | undefined)
        ?.revalidateOnLoad
    ).toBeUndefined();
  });

  it('skips persistence and offline boot in light mode', async () => {
    render(
      <QueryProvider mode='light'>
        <div>light-query-provider-child</div>
      </QueryProvider>
    );

    expect(screen.getByText('light-query-provider-child')).toBeInTheDocument();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(useQueryPersistenceMock).not.toHaveBeenCalled();
    expect(setupOfflineSupportMock).not.toHaveBeenCalled();
  });
});
