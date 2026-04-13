// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

const createCreateMutationV2Mock = vi.hoisted(() => vi.fn());
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
  };
});

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
  ApiError: class ApiError extends Error {},
}));

import {
  useCheckTraderaStatusMutation,
  useRelistTraderaMutation,
} from './useProductListingMutations';

describe('useProductListingMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCreateMutationV2Mock.mockReturnValue({ kind: 'mutation' });
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
});
