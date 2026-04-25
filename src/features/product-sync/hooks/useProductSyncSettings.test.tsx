// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { productSettingsKeys } from '@/shared/lib/query-key-exports';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

import { useProductSyncProfiles } from './useProductSyncSettings';

describe('useProductSyncSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'sync-profiles-query' });
    apiGetMock.mockResolvedValue({
      profiles: [{ id: 'profile-1', name: 'Base Product Sync' }],
    });
  });

  it('refetches sync profiles on mount so the BL modal sees the current selected profile', async () => {
    const { result } = renderHook(() => useProductSyncProfiles());
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'sync-profiles-query' });
    expect(config.queryKey).toEqual(productSettingsKeys.syncProfiles());
    expect(config.staleTime).toBe(0);
    expect(config.refetchOnMount).toBe('always');

    await expect(config.queryFn()).resolves.toEqual([
      { id: 'profile-1', name: 'Base Product Sync' },
    ]);
    expect(apiGetMock).toHaveBeenCalledWith('/api/v2/products/sync/profiles', {
      cache: 'no-store',
    });
  });
});
