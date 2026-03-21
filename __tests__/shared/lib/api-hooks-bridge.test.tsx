import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';

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

describe('query-factories-v2', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestClient();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('createListQueryV2 resolves GET request with params', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ items: ['x'] });

    const { result } = renderHook(
      () =>
        createListQueryV2<{ items: string[] }, { items: string[] }>({
          queryKey: ['items', 1],
          queryFn: () => api.get<{ items: string[] }>('/api/items', { params: { page: 1 } }),
          meta: {
            source: 'tests.shared.query-factories-v2.get',
            operation: 'list',
            resource: 'items',
          },
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({
        params: { page: 1 },
      })
    );
    expect(result.current.data).toEqual({ items: ['x'] });
  });

  it('createListQueryV2 resolves POST request in queryFn when needed', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ ids: ['a', 'b'] });

    const { result } = renderHook(
      () =>
        createListQueryV2<{ ids: string[] }, { ids: string[] }>({
          queryKey: ['search', 'abc'],
          queryFn: () => api.post<{ ids: string[] }>('/api/search', { query: 'abc' }, {}),
          meta: {
            source: 'tests.shared.query-factories-v2.post',
            operation: 'list',
            resource: 'search',
          },
        }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.post).toHaveBeenCalledWith(
      '/api/search',
      { query: 'abc' },
      expect.objectContaining({})
    );
    expect(result.current.data).toEqual({ ids: ['a', 'b'] });
  });

  it('createMutationV2 can invalidate keys via onSuccess', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
      () => {
        const client = queryClient;
        return createMutationV2<{ ok: boolean }, { id: string }>({
          mutationFn: async () => ({ ok: true }),
          mutationKey: ['items', 'mutation'],
          meta: {
            source: 'tests.shared.query-factories-v2.mutation',
            operation: 'action',
            resource: 'items',
          },
          onSuccess: async () => {
            await client.invalidateQueries({ queryKey: ['items'] });
            await client.invalidateQueries({ queryKey: ['items', 'detail'] });
          },
        });
      },
      { wrapper }
    );
    await result.current.mutateAsync({ id: '1' });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['items'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['items', 'detail'] });
  });
});
