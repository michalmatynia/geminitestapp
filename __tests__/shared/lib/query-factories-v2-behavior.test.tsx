import { type InfiniteData, QueryClient, QueryClientProvider, type UseInfiniteQueryResult, type UseQueryResult, type UseSuspenseQueryResult } from '@tanstack/react-query';
import { renderHook, waitFor } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  createInfiniteQueryV2,
  createListQueryV2,
  createSingleQueryV2,
  type MultiQueryResultsV2,
  type QueryDescriptorV2,
  type SuspenseMultiQueryResultsV2,
  type SuspenseQueryDescriptorV2,
} from '@/shared/lib/query-factories-v2';

import type { ReactElement, ReactNode } from 'react';

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('query-factories-v2 behavior', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestClient();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('runs list query when enabled', async () => {
    const fetcher = vi.fn(async () => ['a', 'b']);
    const { result } = renderHook(
      () =>
        createListQueryV2<string, string[]>({
          queryKey: ['legacy', 'list'],
          queryFn: fetcher,
          enabled: true,
          meta: {
            source: 'tests.shared.query-factories-v2.list-enabled',
            operation: 'list',
            resource: 'legacy.list',
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(['a', 'b']);
  });

  it('skips list query when disabled', async () => {
    const fetcher = vi.fn(async () => ['a', 'b']);
    const { result } = renderHook(
      () =>
        createListQueryV2<string, string[]>({
          queryKey: ['legacy', 'override'],
          queryFn: fetcher,
          enabled: false,
          meta: {
            source: 'tests.shared.query-factories-v2.list-disabled',
            operation: 'list',
            resource: 'legacy.override',
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('runs single query with id-based key', async () => {
    const fetcher = vi.fn(async () => ({ id: '1' }));
    const { result } = renderHook(
      () =>
        createSingleQueryV2<{ id: string }>({
          id: '1',
          queryKey: (id: string) => ['legacy', 'detail', id],
          queryFn: fetcher,
          enabled: true,
          meta: {
            source: 'tests.shared.query-factories-v2.single',
            operation: 'detail',
            resource: 'legacy.detail',
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ id: '1' });
  });

  it('applies guarded refetch defaults and sanitizes invalid polling values', async () => {
    const fetcher = vi.fn(async () => ['a']);

    const { result } = renderHook(
      () =>
        createListQueryV2<string, string[]>({
          queryKey: ['legacy', 'refetch-guards'],
          queryFn: fetcher,
          refetchInterval: -100,
          meta: {
            source: 'tests.shared.query-factories-v2.refetch-guards',
            operation: 'list',
            resource: 'legacy.refetch-guards',
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ['legacy', 'refetch-guards'] });
    const queryOptions = (query as { options?: Record<string, unknown> } | undefined)?.options;
    expect(query).toBeDefined();
    expect(queryOptions?.['refetchOnMount']).toBe(false);
    expect(queryOptions?.['refetchOnWindowFocus']).toBe(false);
    expect(queryOptions?.['refetchOnReconnect']).toBe(false);
    expect(queryOptions?.['refetchIntervalInBackground']).toBe(false);
    expect(queryOptions?.['refetchInterval']).toBe(false);
  });

  it('keeps enabled callback semantics while enforcing required single-query id', async () => {
    const fetcher = vi.fn(async () => ({ id: '2' }));
    const enabled = vi.fn(() => true);

    const { result } = renderHook(
      () =>
        createSingleQueryV2<{ id: string }>({
          id: null,
          queryKey: (id: string) => ['legacy', 'detail', id],
          queryFn: fetcher,
          enabled,
          meta: {
            source: 'tests.shared.query-factories-v2.single-id-guard',
            operation: 'detail',
            resource: 'legacy.detail-id-guard',
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetcher).not.toHaveBeenCalled();
    expect(enabled).not.toHaveBeenCalled();
  });

  it('preserves tuple result types for multi query descriptors', () => {
    type Results = MultiQueryResultsV2<
      [
        QueryDescriptorV2<string[]>,
        QueryDescriptorV2<{ connectionId?: string | null }>
      ]
    >;

    expectTypeOf<Results>().toEqualTypeOf<
      [
        UseQueryResult<string[], Error>,
        UseQueryResult<{ connectionId?: string | null }, Error>,
      ]
    >();
  });

  it('preserves homogeneous array result types for dynamic multi queries', () => {
    type Results = MultiQueryResultsV2<QueryDescriptorV2<number[]>[]>;

    expectTypeOf<Results>().toEqualTypeOf<UseQueryResult<number[], Error>[]>();
  });

  it('preserves suspense multi query result types', () => {
    type Results = SuspenseMultiQueryResultsV2<
      [
        SuspenseQueryDescriptorV2<string[]>,
        SuspenseQueryDescriptorV2<{ id: string }>
      ]
    >;

    expectTypeOf<Results>().toEqualTypeOf<
      [
        UseSuspenseQueryResult<string[], Error>,
        UseSuspenseQueryResult<{ id: string }, Error>,
      ]
    >();
  });

  it('supports TanStack v5 infinite-query options shape', async () => {
    const { result } = renderHook(
      () =>
        createInfiniteQueryV2<{ items: string[] }>({
          queryKey: ['legacy', 'infinite'],
          initialPageParam: 0,
          queryFn: async ({ pageParam }) => ({ items: [String(pageParam)] }),
          getNextPageParam: () => undefined,
          meta: {
            source: 'tests.shared.query-factories-v2.infinite',
            operation: 'infinite',
            resource: 'legacy.infinite',
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual({ items: ['0'] });
    expectTypeOf(result.current).toEqualTypeOf<
      UseInfiniteQueryResult<InfiniteData<{ items: string[] }>, Error>
    >();
  });
});
