import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';

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
});
