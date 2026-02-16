import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/shared/lib/api-client';
import {
  createMutationHook,
  createQueryHook,
} from '@/shared/lib/api-hooks';

import type { ReactElement, ReactNode } from 'react';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('api-hooks bridge', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestClient();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('createQueryHook resolves GET request via legacy query factory bridge', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ items: ['x'] });
    const useHook = createQueryHook<{ items: string[] }, { page: number }>({
      queryKeyFactory: (params) => ['items', params.page],
      endpoint: '/api/items',
    });

    const { result } = renderHook(() => useHook({ page: 1 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({
        params: { page: 1 },
      })
    );
    expect(result.current.data).toEqual({ items: ['x'] });
  });

  it('createQueryHook resolves POST request when method is POST', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ ids: ['a', 'b'] });
    const useHook = createQueryHook<{ ids: string[] }, { query: string }>({
      queryKeyFactory: (params) => ['search', params.query],
      endpoint: '/api/search',
      apiOptions: {
        method: 'POST',
      },
    });

    const { result } = renderHook(() => useHook({ query: 'abc' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.post).toHaveBeenCalledWith(
      '/api/search',
      { query: 'abc' },
      expect.objectContaining({})
    );
    expect(result.current.data).toEqual({ ids: ['a', 'b'] });
  });

  it('createMutationHook invalidates keys on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const useHook = createMutationHook<{ ok: boolean }, { id: string }>({
      mutationFn: async () => ({ ok: true }),
      invalidateKeys: [['items'], ['items', 'detail']],
    });

    const { result } = renderHook(() => useHook(), { wrapper });
    await result.current.mutateAsync({ id: '1' });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['items', 'detail'] });
  });
});
