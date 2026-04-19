/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
  },
}));

import { buildDefaultKangurPageContentStore } from '@/features/kangur/ai-tutor/page-content-catalog';
import {
  prefetchKangurPageContentStore,
  useKangurPageContentStore,
} from '@/features/kangur/ui/hooks/useKangurPageContent';

const STALE_TIME_MS = 5 * 60_000;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
};

describe('useKangurPageContentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue(buildDefaultKangurPageContentStore('pl'));
  });

  afterEach(() => {
    vi.useRealTimers();
    focusManager.setFocused(undefined);
  });

  it('fetches page content from the API instead of seeding it from the static catalog', async () => {
    const { wrapper } = createWrapper();
    const query = renderHook(() => useKangurPageContentStore(), { wrapper });

    expect(query.result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(query.result.current.data?.entries.length).toBeGreaterThan(0);
    });

    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/page-content?locale=pl', {
      timeout: 45000,
    });
  });

  it('does not refetch stale page content when Kangur widgets remount', async () => {
    const { wrapper } = createWrapper();
    const firstMount = renderHook(() => useKangurPageContentStore(), { wrapper });

    await waitFor(() => {
      expect(firstMount.result.current.data?.entries.length).toBeGreaterThan(0);
    });
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    firstMount.unmount();

    vi.advanceTimersByTime(STALE_TIME_MS + 1);

    const secondMount = renderHook(() => useKangurPageContentStore(), { wrapper });

    expect(secondMount.result.current.data?.entries.length).toBeGreaterThan(0);
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it('does not refetch stale page content when the window regains focus', async () => {
    const { wrapper } = createWrapper();
    const query = renderHook(() => useKangurPageContentStore(), { wrapper });

    await waitFor(() => {
      expect(query.result.current.data?.entries.length).toBeGreaterThan(0);
    });
    expect(apiGetMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    vi.advanceTimersByTime(STALE_TIME_MS + 1);

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    expect(query.result.current.data?.entries.length).toBeGreaterThan(0);
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces API failures instead of fabricating local page content', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('mongo unavailable'));

    const { wrapper } = createWrapper();
    const query = renderHook(() => useKangurPageContentStore(), { wrapper });

    await waitFor(() => {
      expect(query.result.current.isError).toBe(true);
    });

    expect(query.result.current.data).toBeUndefined();
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it('stays idle when the query is explicitly disabled', async () => {
    const { wrapper } = createWrapper();
    const query = renderHook(() => useKangurPageContentStore(undefined, { enabled: false }), {
      wrapper,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(query.result.current.fetchStatus).toBe('idle');
    expect(query.result.current.data).toBeUndefined();
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('retries a recoverable timeout once so cold-start fetches can self-heal without refresh', async () => {
    vi.useFakeTimers();
    apiGetMock
      .mockRejectedValueOnce(new Error('Request timeout after 45000ms'))
      .mockResolvedValueOnce(buildDefaultKangurPageContentStore('pl'));

    const { wrapper } = createWrapper();
    const query = renderHook(() => useKangurPageContentStore(), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(apiGetMock).toHaveBeenCalledTimes(2);
    expect(query.result.current.data?.entries.length).toBeGreaterThan(0);
    expect(query.result.current.isSuccess).toBe(true);
  });

  it('marks page-content queries as silent so timeout fallbacks do not raise global toasts', async () => {
    const { queryClient, wrapper } = createWrapper();
    const query = renderHook(() => useKangurPageContentStore(), { wrapper });

    await waitFor(() => {
      expect(query.result.current.data?.entries.length).toBeGreaterThan(0);
    });

    const cachedQuery = queryClient.getQueryCache().find({
      queryKey: ['kangur', 'page-content', { locale: 'pl' }],
    });

    expect(cachedQuery?.meta).toMatchObject({
      tanstackFactoryV2Meta: {
        errorPresentation: 'silent',
      },
    });
  });

  it('returns false from prefetch when the query still ends in error after the prefetch attempt', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('Request timeout after 45000ms'));

    const { queryClient } = createWrapper();
    const didPrefetch = await prefetchKangurPageContentStore(queryClient, 'pl');

    expect(didPrefetch).toBe(false);
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(['kangur', 'page-content', { locale: 'pl' }])?.status).toBe(
      'error'
    );
  });
});
