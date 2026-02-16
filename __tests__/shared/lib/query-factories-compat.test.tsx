import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createListQuery, createSingleQuery } from '@/shared/lib/query-factories';

import type { ReactElement, ReactNode } from 'react';

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('query-factories legacy compatibility', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestClient();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('supports legacy nested options in createListQuery', async () => {
    const fetcher = vi.fn(async () => ['a', 'b']);
    const { result } = renderHook(
      () =>
        createListQuery<string>({
          queryKey: ['legacy', 'list'],
          queryFn: fetcher,
          options: {
            enabled: true,
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(['a', 'b']);
  });

  it('lets top-level options override nested options', async () => {
    const fetcher = vi.fn(async () => ['a', 'b']);
    const { result } = renderHook(
      () =>
        createListQuery<string>({
          queryKey: ['legacy', 'override'],
          queryFn: fetcher,
          options: {
            enabled: true,
          },
          enabled: false,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('supports legacy nested options in createSingleQuery', async () => {
    const fetcher = vi.fn(async () => ({ id: '1' }));
    const { result } = renderHook(
      () =>
        createSingleQuery<{ id: string }>({
          id: '1',
          queryKey: (id: string) => ['legacy', 'detail', id],
          queryFn: fetcher,
          options: {
            enabled: true,
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ id: '1' });
  });
});

