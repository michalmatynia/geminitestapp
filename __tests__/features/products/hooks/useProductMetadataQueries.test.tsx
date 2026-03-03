import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  productMetadataKeys,
  useParameters,
  useDeleteProducerMutation,
  useSaveProducerMutation,
} from '@/features/products/hooks/useProductMetadataQueries';
import { api } from '@/shared/lib/api-client';

vi.mock('@/shared/lib/api-client', () => ({
  ApiError: class MockApiError extends Error {},
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useProductMetadataQueries invalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useSaveProducerMutation create path invalidates producers metadata key', async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 'producer-1',
      name: 'Acme',
      website: null,
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveProducerMutation(), { wrapper });

    await result.current.mutateAsync({
      id: undefined,
      data: { name: 'Acme', website: null },
    });

    expect(api.post).toHaveBeenCalledWith('/api/products/producers', {
      name: 'Acme',
      website: null,
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productMetadataKeys.all,
    });
  });

  it('useSaveProducerMutation update path invalidates producers metadata key', async () => {
    vi.mocked(api.put).mockResolvedValue({
      id: 'producer-1',
      name: 'Acme Updated',
      website: 'https://example.com',
    } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveProducerMutation(), { wrapper });

    await result.current.mutateAsync({
      id: 'producer-1',
      data: { name: 'Acme Updated', website: 'https://example.com' },
    });

    expect(api.put).toHaveBeenCalledWith('/api/products/producers/producer-1', {
      name: 'Acme Updated',
      website: 'https://example.com',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productMetadataKeys.all,
    });
  });

  it('useDeleteProducerMutation invalidates producers metadata key', async () => {
    vi.mocked(api.delete).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteProducerMutation(), { wrapper });

    await result.current.mutateAsync('producer-1');

    expect(api.delete).toHaveBeenCalledWith('/api/products/producers/producer-1');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: productMetadataKeys.all,
    });
  });

  it('useParameters requests a fresh parameter list for the selected catalog', async () => {
    vi.mocked(api.get).mockResolvedValue([
      {
        id: 'param-1',
        catalogId: 'catalog-1',
        name_en: 'Material',
      },
    ] as never);

    const { result } = renderHook(() => useParameters('catalog-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(api.get).toHaveBeenCalledWith(
      '/api/products/parameters',
      expect.objectContaining({
        params: {
          catalogId: 'catalog-1',
          fresh: 1,
        },
        cache: 'no-store',
      })
    );
  });
});
