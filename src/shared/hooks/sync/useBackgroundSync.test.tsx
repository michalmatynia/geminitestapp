// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { useProductListSync } from './useBackgroundSync';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('useProductListSync', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('refetches the active product-list query family while product work is queued', async () => {
    vi.useFakeTimers();
    const queryClient = createQueryClient();
    const refetchQueries = vi
      .spyOn(queryClient, 'refetchQueries')
      .mockResolvedValue(undefined);

    renderHook(
      () => useProductListSync({ page: 1, pageSize: 20 }, true),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(refetchQueries).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.lists(),
    });
  });
});
