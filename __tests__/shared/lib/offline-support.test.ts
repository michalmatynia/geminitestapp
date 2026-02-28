import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSyncStoragePersisterMock, persistQueryClientMock } = vi.hoisted(() => ({
  createSyncStoragePersisterMock: vi.fn(() => ({
    persistClient: vi.fn(),
    restoreClient: vi.fn(),
    removeClient: vi.fn(),
  })),
  persistQueryClientMock: vi.fn(() => [vi.fn(), Promise.resolve()] as const),
}));

vi.mock('@tanstack/query-sync-storage-persister', () => ({
  createSyncStoragePersister: createSyncStoragePersisterMock,
}));

vi.mock('@tanstack/react-query-persist-client', () => ({
  persistQueryClient: persistQueryClientMock,
}));

import { offlineQueries, isOfflineQuery, setupOfflineSupport } from '@/shared/lib/offline-support';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

describe('offline-support', () => {
  beforeEach(() => {
    createSyncStoragePersisterMock.mockClear();
    persistQueryClientMock.mockClear();
  });

  it('does not include products in offline persisted roots', () => {
    expect(offlineQueries).not.toContain(QUERY_KEYS.products.all[0]);
    expect(isOfflineQuery(QUERY_KEYS.products.all)).toBe(false);
  });

  it('keeps settings and user preferences as offline persisted roots', () => {
    expect(isOfflineQuery(QUERY_KEYS.settings.all)).toBe(true);
    expect(isOfflineQuery(QUERY_KEYS.userPreferences.all)).toBe(true);
  });

  it('dehydrates only successful offline queries', () => {
    const queryClient = new QueryClient();
    setupOfflineSupport(queryClient);

    expect(persistQueryClientMock).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(persistQueryClientMock).mock.calls[0] as any;
    const options = callArgs?.[0];
    const shouldDehydrate = options?.dehydrateOptions?.shouldDehydrateQuery;
    expect(typeof shouldDehydrate).toBe('function');
    if (!shouldDehydrate) return;

    expect(
      shouldDehydrate({
        state: { status: 'success' },
        queryKey: QUERY_KEYS.settings.all,
      })
    ).toBe(true);
    expect(
      shouldDehydrate({
        state: { status: 'success' },
        queryKey: QUERY_KEYS.products.all,
      })
    ).toBe(false);
    expect(
      shouldDehydrate({
        state: { status: 'error' },
        queryKey: QUERY_KEYS.settings.all,
      })
    ).toBe(false);
  });
});
