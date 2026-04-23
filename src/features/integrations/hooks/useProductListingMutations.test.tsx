// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

const createCreateMutationV2Mock = vi.hoisted(() => vi.fn());
const createDeleteMutationV2Mock = vi.hoisted(() => vi.fn());
const apiDeleteMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());
const queryClientMock = vi.hoisted(() => ({
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  setQueriesData: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => queryClientMock,
  };
});

vi.mock('@/shared/lib/query-factories-v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/query-factories-v2')>();
  return {
    ...actual,
    createCreateMutationV2: createCreateMutationV2Mock,
    createDeleteMutationV2: createDeleteMutationV2Mock,
  };
});

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    delete: apiDeleteMock,
    post: apiPostMock,
  },
  ApiError: class ApiError extends Error {},
}));

import {
  useDeleteFromBaseMutation,
  useCheckTraderaStatusMutation,
  usePurgeListingMutation,
  useRelistTraderaMutation,
  useSyncTraderaMutation,
} from './useProductListingMutations';

describe('useProductListingMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCreateMutationV2Mock.mockReturnValue({ kind: 'mutation' });
    createDeleteMutationV2Mock.mockReturnValue({ kind: 'delete-mutation' });
    apiDeleteMock.mockResolvedValue(undefined);
    apiPostMock.mockResolvedValue({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'playwright-programmable-listings',
        jobId: 'job-playwright-1',
        enqueuedAt: '2026-04-02T20:00:00.000Z',
      },
    });
    queryClientMock.cancelQueries.mockResolvedValue(undefined);
    queryClientMock.invalidateQueries.mockResolvedValue(undefined);
    queryClientMock.setQueriesData.mockImplementation(() => undefined);
  });

  it('patches a deleted Base listing into the cached listing and invalidates product detail state', async () => {
    const listingsQueryKey = QUERY_KEYS.integrations.listings('product-1');
    const productDetailQueryKey = QUERY_KEYS.products.detail('product-1');
    const productDetailEditQueryKey = QUERY_KEYS.products.detailEdit('product-1');
    let cachedListings = [
      {
        id: 'listing-1',
        status: 'active',
        externalListingId: 'base-product-123',
        inventoryId: 'inv-main',
        failureReason: 'Old issue',
        exportHistory: [],
      },
    ];
    let cachedJobs = [
      {
        id: 'job-1',
        listings: [
          {
            id: 'listing-1',
            status: 'active',
            externalListingId: 'base-product-123',
            inventoryId: 'inv-main',
            failureReason: 'Old issue',
            exportHistory: [],
          },
        ],
      },
    ];

    queryClientMock.getQueryData.mockImplementation((queryKey: readonly unknown[]) => {
      const key = JSON.stringify(queryKey);
      if (key === JSON.stringify(listingsQueryKey)) {
        return cachedListings;
      }
      if (key === JSON.stringify(QUERY_KEYS.jobs.integrations())) {
        return cachedJobs;
      }
      return undefined;
    });
    queryClientMock.setQueryData.mockImplementation(
      (queryKey: readonly unknown[], value: unknown) => {
        const key = JSON.stringify(queryKey);
        if (key === JSON.stringify(listingsQueryKey)) {
          cachedListings =
            typeof value === 'function'
              ? (value as (current: typeof cachedListings) => typeof cachedListings)(cachedListings)
              : (value as typeof cachedListings);
          return;
        }
        if (key === JSON.stringify(QUERY_KEYS.jobs.integrations())) {
          cachedJobs =
            typeof value === 'function'
              ? (value as (current: typeof cachedJobs) => typeof cachedJobs)(cachedJobs)
              : (value as typeof cachedJobs);
        }
      }
    );

    const { result } = renderHook(() => useDeleteFromBaseMutation('product-1'));
    const config = createDeleteMutationV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'delete-mutation' });

    await config.onMutate({ listingId: 'listing-1', inventoryId: 'inv-main' });
    expect(cachedListings[0]).toMatchObject({
      status: 'running',
      externalListingId: 'base-product-123',
    });

    await config.invalidate(queryClientMock, { status: 'deleted' }, {
      listingId: 'listing-1',
      inventoryId: 'inv-main',
    });

    expect(cachedListings[0]).toMatchObject({
      status: 'removed',
      externalListingId: null,
      inventoryId: 'inv-main',
      failureReason: null,
    });
    expect(cachedListings[0].exportHistory[0]).toMatchObject({
      status: 'deleted',
      inventoryId: 'inv-main',
      externalListingId: 'base-product-123',
    });
    expect(cachedJobs[0]?.listings[0]).toMatchObject({
      status: 'removed',
      externalListingId: null,
      failureReason: null,
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.lists(),
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productDetailQueryKey,
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productDetailEditQueryKey,
    });
  });

  it('invalidates product detail caches after purging a listing connection', async () => {
    const productDetailQueryKey = QUERY_KEYS.products.detail('product-1');
    const productDetailEditQueryKey = QUERY_KEYS.products.detailEdit('product-1');

    const { result } = renderHook(() => usePurgeListingMutation('product-1'));
    const config = createDeleteMutationV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'delete-mutation' });

    await expect(config.mutationFn('listing-1')).resolves.toBeUndefined();
    expect(apiDeleteMock).toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-1/listings/listing-1/purge'
    );

    await config.invalidate(queryClientMock);

    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.lists(),
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productDetailQueryKey,
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productDetailEditQueryKey,
    });
  });

  it('posts Playwright relist browser-mode overrides to the relist endpoint', async () => {
    const { result } = renderHook(() => useRelistTraderaMutation('product-1'));
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'mutation' });
    expect(config.mutationKey).toEqual(QUERY_KEYS.integrations.listings('product-1'));

    await expect(
      config.mutationFn({ listingId: 'listing-1', browserMode: 'headed' })
    ).resolves.toMatchObject({
      listingId: 'listing-1',
      queue: {
        name: 'playwright-programmable-listings',
      },
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-1/listings/listing-1/relist',
      { browserMode: 'headed' }
    );
  });

  it('patches queued Playwright relist browser mode into the cached listing immediately', async () => {
    const listingsQueryKey = QUERY_KEYS.integrations.listings('product-1');
    let cachedListings = [
      {
        id: 'listing-1',
        status: 'failed',
        failureReason: 'Old failure',
        integration: {
          slug: 'playwright-programmable',
        },
        marketplaceData: {
          playwright: {},
        },
      },
    ];

    queryClientMock.getQueryData.mockImplementation((queryKey: readonly unknown[]) => {
      if (JSON.stringify(queryKey) === JSON.stringify(listingsQueryKey)) {
        return cachedListings;
      }
      return undefined;
    });
    queryClientMock.setQueryData.mockImplementation(
      (queryKey: readonly unknown[], value: unknown) => {
        if (JSON.stringify(queryKey) !== JSON.stringify(listingsQueryKey)) return;
        cachedListings =
          typeof value === 'function'
            ? (value as (current: typeof cachedListings) => typeof cachedListings)(cachedListings)
            : (value as typeof cachedListings);
      }
    );

    renderHook(() => useRelistTraderaMutation('product-1'));
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    await config.onMutate({ listingId: 'listing-1', browserMode: 'headed' });

    expect(cachedListings[0]).toMatchObject({
      status: 'queued_relist',
      failureReason: null,
      marketplaceData: {
        marketplace: 'playwright-programmable',
        playwright: {
          pendingExecution: {
            requestedBrowserMode: 'headed',
            requestId: null,
            queuedAt: null,
          },
        },
      },
    });

    await config.invalidate(
      queryClientMock,
      {
        queued: true,
        listingId: 'listing-1',
        queue: {
          name: 'playwright-programmable-listings',
          jobId: 'job-playwright-1',
          enqueuedAt: '2026-04-02T20:00:00.000Z',
        },
      },
      { listingId: 'listing-1', browserMode: 'headed' }
    );

    expect(cachedListings[0]).toMatchObject({
      status: 'queued_relist',
      marketplaceData: {
        playwright: {
          pendingExecution: {
            requestedBrowserMode: 'headed',
            requestId: 'job-playwright-1',
            queuedAt: '2026-04-02T20:00:00.000Z',
          },
        },
      },
    });
  });

  it('patches queued Tradera relist browser mode into the cached listing immediately', async () => {
    const listingsQueryKey = QUERY_KEYS.integrations.listings('product-1');
    let cachedListings = [
      {
        id: 'listing-1',
        status: 'failed',
        failureReason: 'Auth required',
        integration: {
          slug: 'tradera',
        },
        marketplaceData: {
          tradera: {},
        },
      },
    ];

    queryClientMock.getQueryData.mockImplementation((queryKey: readonly unknown[]) => {
      if (JSON.stringify(queryKey) === JSON.stringify(listingsQueryKey)) {
        return cachedListings;
      }
      return undefined;
    });
    queryClientMock.setQueryData.mockImplementation(
      (queryKey: readonly unknown[], value: unknown) => {
        if (JSON.stringify(queryKey) !== JSON.stringify(listingsQueryKey)) return;
        cachedListings =
          typeof value === 'function'
            ? (value as (current: typeof cachedListings) => typeof cachedListings)(cachedListings)
            : (value as typeof cachedListings);
      }
    );
    apiPostMock.mockResolvedValue({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-1',
        enqueuedAt: '2026-04-02T20:00:00.000Z',
      },
    });

    renderHook(() => useRelistTraderaMutation('product-1'));
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    await config.onMutate({ listingId: 'listing-1', browserMode: 'headed' });

    expect(cachedListings[0]).toMatchObject({
      status: 'queued_relist',
      failureReason: null,
      marketplaceData: {
        marketplace: 'tradera',
        tradera: {
          pendingExecution: {
            requestedBrowserMode: 'headed',
            requestId: null,
            queuedAt: null,
          },
        },
      },
    });

    await config.invalidate(
      queryClientMock,
      {
        queued: true,
        listingId: 'listing-1',
        queue: {
          name: 'tradera-listings',
          jobId: 'job-tradera-1',
          enqueuedAt: '2026-04-02T20:00:00.000Z',
        },
      },
      { listingId: 'listing-1', browserMode: 'headed' }
    );

    expect(cachedListings[0]).toMatchObject({
      status: 'queued_relist',
      marketplaceData: {
        tradera: {
          pendingExecution: {
            requestedBrowserMode: 'headed',
            requestId: 'job-tradera-1',
            queuedAt: '2026-04-02T20:00:00.000Z',
          },
        },
      },
    });
  });

  it('posts and patches selectorProfile overrides for queued Tradera relists', async () => {
    const listingsQueryKey = QUERY_KEYS.integrations.listings('product-1');
    let cachedListings = [
      {
        id: 'listing-1',
        status: 'failed',
        failureReason: 'Auth required',
        integration: {
          slug: 'tradera',
        },
        marketplaceData: {
          tradera: {},
        },
      },
    ];

    queryClientMock.getQueryData.mockImplementation((queryKey: readonly unknown[]) => {
      if (JSON.stringify(queryKey) === JSON.stringify(listingsQueryKey)) {
        return cachedListings;
      }
      return undefined;
    });
    queryClientMock.setQueryData.mockImplementation(
      (queryKey: readonly unknown[], value: unknown) => {
        if (JSON.stringify(queryKey) !== JSON.stringify(listingsQueryKey)) return;
        cachedListings =
          typeof value === 'function'
            ? (value as (current: typeof cachedListings) => typeof cachedListings)(cachedListings)
            : (value as typeof cachedListings);
      }
    );
    apiPostMock.mockResolvedValue({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-relist-2',
        enqueuedAt: '2026-04-02T21:00:00.000Z',
      },
    });

    renderHook(() => useRelistTraderaMutation('product-1'));
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    await expect(
      config.mutationFn({
        listingId: 'listing-1',
        selectorProfile: 'profile-market-a',
      })
    ).resolves.toMatchObject({
      queued: true,
      listingId: 'listing-1',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-1/listings/listing-1/relist',
      {
        selectorProfile: 'profile-market-a',
      }
    );

    await config.onMutate({
      listingId: 'listing-1',
      selectorProfile: 'profile-market-a',
    });

    expect(cachedListings[0]).toMatchObject({
      marketplaceData: {
        tradera: {
          pendingExecution: {
            action: 'relist',
            requestedSelectorProfile: 'profile-market-a',
          },
        },
      },
    });

    await config.invalidate(
      queryClientMock,
      {
        queued: true,
        listingId: 'listing-1',
        queue: {
          name: 'tradera-listings',
          jobId: 'job-tradera-relist-2',
          enqueuedAt: '2026-04-02T21:00:00.000Z',
        },
      },
      {
        listingId: 'listing-1',
        selectorProfile: 'profile-market-a',
      }
    );

    expect(cachedListings[0]).toMatchObject({
      marketplaceData: {
        tradera: {
          pendingExecution: {
            action: 'relist',
            requestedSelectorProfile: 'profile-market-a',
            requestId: 'job-tradera-relist-2',
            queuedAt: '2026-04-02T21:00:00.000Z',
          },
        },
      },
    });
  });

  it('posts and patches selectorProfile overrides for queued Tradera sync jobs', async () => {
    const listingsQueryKey = QUERY_KEYS.integrations.listings('product-1');
    let cachedListings = [
      {
        id: 'listing-1',
        status: 'active',
        failureReason: null,
        integration: {
          slug: 'tradera',
        },
        marketplaceData: {
          tradera: {},
        },
      },
    ];

    queryClientMock.getQueryData.mockImplementation((queryKey: readonly unknown[]) => {
      if (JSON.stringify(queryKey) === JSON.stringify(listingsQueryKey)) {
        return cachedListings;
      }
      return undefined;
    });
    queryClientMock.setQueryData.mockImplementation(
      (queryKey: readonly unknown[], value: unknown) => {
        if (JSON.stringify(queryKey) !== JSON.stringify(listingsQueryKey)) return;
        cachedListings =
          typeof value === 'function'
            ? (value as (current: typeof cachedListings) => typeof cachedListings)(cachedListings)
            : (value as typeof cachedListings);
      }
    );
    apiPostMock.mockResolvedValue({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-sync-2',
        enqueuedAt: '2026-04-02T21:15:00.000Z',
      },
    });

    renderHook(() => useSyncTraderaMutation('product-1'));
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    await expect(
      config.mutationFn({
        listingId: 'listing-1',
        selectorProfile: 'profile-market-a',
      })
    ).resolves.toMatchObject({
      queued: true,
      listingId: 'listing-1',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-1/listings/listing-1/sync',
      {
        selectorProfile: 'profile-market-a',
      }
    );

    await config.onMutate({
      listingId: 'listing-1',
      selectorProfile: 'profile-market-a',
    });

    expect(cachedListings[0]).toMatchObject({
      marketplaceData: {
        tradera: {
          pendingExecution: {
            action: 'sync',
            requestedSelectorProfile: 'profile-market-a',
          },
        },
      },
    });
  });

  it('patches queued Tradera status checks with connection-default browser mode when no override is provided', async () => {
    const listingsQueryKey = QUERY_KEYS.integrations.listings('product-1');
    let cachedListings = [
      {
        id: 'listing-1',
        status: 'active',
        failureReason: null,
        integration: {
          slug: 'tradera',
        },
        marketplaceData: {
          tradera: {},
        },
      },
    ];

    queryClientMock.getQueryData.mockImplementation((queryKey: readonly unknown[]) => {
      if (JSON.stringify(queryKey) === JSON.stringify(listingsQueryKey)) {
        return cachedListings;
      }
      return undefined;
    });
    queryClientMock.setQueryData.mockImplementation(
      (queryKey: readonly unknown[], value: unknown) => {
        if (JSON.stringify(queryKey) !== JSON.stringify(listingsQueryKey)) return;
        cachedListings =
          typeof value === 'function'
            ? (value as (current: typeof cachedListings) => typeof cachedListings)(cachedListings)
            : (value as typeof cachedListings);
      }
    );
    apiPostMock.mockResolvedValue({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-check-status-1',
        enqueuedAt: '2026-04-02T20:00:00.000Z',
      },
    });

    renderHook(() => useCheckTraderaStatusMutation('product-1'));
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    await config.onMutate({ listingId: 'listing-1' });

    expect(cachedListings[0]).toMatchObject({
      marketplaceData: {
        marketplace: 'tradera',
        tradera: {
          pendingExecution: {
            action: 'check_status',
            requestedBrowserMode: 'connection_default',
          },
        },
      },
    });

    await config.invalidate(
      queryClientMock,
      {
        queued: true,
        listingId: 'listing-1',
        queue: {
          name: 'tradera-listings',
          jobId: 'job-tradera-check-status-1',
          enqueuedAt: '2026-04-02T20:00:00.000Z',
        },
      },
      { listingId: 'listing-1' }
    );

    expect(cachedListings[0]).toMatchObject({
      marketplaceData: {
        tradera: {
          pendingExecution: {
            action: 'check_status',
            requestedBrowserMode: 'connection_default',
            requestId: 'job-tradera-check-status-1',
            queuedAt: '2026-04-02T20:00:00.000Z',
          },
        },
      },
    });
  });

  it('posts and patches selectorProfile overrides for queued Tradera status checks', async () => {
    const listingsQueryKey = QUERY_KEYS.integrations.listings('product-1');
    let cachedListings = [
      {
        id: 'listing-1',
        status: 'active',
        failureReason: null,
        integration: {
          slug: 'tradera',
        },
        marketplaceData: {
          tradera: {},
        },
      },
    ];

    queryClientMock.getQueryData.mockImplementation((queryKey: readonly unknown[]) => {
      if (JSON.stringify(queryKey) === JSON.stringify(listingsQueryKey)) {
        return cachedListings;
      }
      return undefined;
    });
    queryClientMock.setQueryData.mockImplementation(
      (queryKey: readonly unknown[], value: unknown) => {
        if (JSON.stringify(queryKey) !== JSON.stringify(listingsQueryKey)) return;
        cachedListings =
          typeof value === 'function'
            ? (value as (current: typeof cachedListings) => typeof cachedListings)(cachedListings)
            : (value as typeof cachedListings);
      }
    );
    apiPostMock.mockResolvedValue({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-check-status-2',
        enqueuedAt: '2026-04-02T21:00:00.000Z',
      },
    });

    renderHook(() => useCheckTraderaStatusMutation('product-1'));
    const config = createCreateMutationV2Mock.mock.calls[0]?.[0];

    await expect(
      config.mutationFn({
        listingId: 'listing-1',
        selectorProfile: 'profile-market-a',
      })
    ).resolves.toMatchObject({
      queued: true,
      listingId: 'listing-1',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/products/product-1/listings/listing-1/check-status',
      {
        selectorProfile: 'profile-market-a',
      }
    );

    await config.onMutate({
      listingId: 'listing-1',
      selectorProfile: 'profile-market-a',
    });

    expect(cachedListings[0]).toMatchObject({
      marketplaceData: {
        tradera: {
          pendingExecution: {
            action: 'check_status',
            requestedBrowserMode: 'connection_default',
            requestedSelectorProfile: 'profile-market-a',
          },
        },
      },
    });

    await config.invalidate(
      queryClientMock,
      {
        queued: true,
        listingId: 'listing-1',
        queue: {
          name: 'tradera-listings',
          jobId: 'job-tradera-check-status-2',
          enqueuedAt: '2026-04-02T21:00:00.000Z',
        },
      },
      {
        listingId: 'listing-1',
        selectorProfile: 'profile-market-a',
      }
    );

    expect(cachedListings[0]).toMatchObject({
      marketplaceData: {
        tradera: {
          pendingExecution: {
            action: 'check_status',
            requestedBrowserMode: 'connection_default',
            requestedSelectorProfile: 'profile-market-a',
            requestId: 'job-tradera-check-status-2',
            queuedAt: '2026-04-02T21:00:00.000Z',
          },
        },
      },
    });
  });
});
