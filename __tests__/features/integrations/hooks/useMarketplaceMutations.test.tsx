import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useFetchExternalCategoriesMutation,
  useFetchExternalProducersMutation,
  useFetchExternalTagsMutation,
  useSaveMappingsMutation,
  useSaveProducerMappingsMutation,
  useSaveTagMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('useMarketplaceMutations invalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useFetchExternalCategoriesMutation invalidates marketplace categories key', async () => {
    vi.mocked(api.post).mockResolvedValue({ fetched: 10, message: 'ok' } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useFetchExternalCategoriesMutation(), { wrapper });

    await result.current.mutateAsync({ connectionId: 'conn-1' });

    expect(api.post).toHaveBeenCalledWith('/api/marketplace/categories/fetch', {
      connectionId: 'conn-1',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.marketplace.categories('conn-1'),
    });
  });

  it('useSaveMappingsMutation invalidates marketplace mappings key', async () => {
    vi.mocked(api.post).mockResolvedValue({ upserted: 1, message: 'ok' } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveMappingsMutation(), { wrapper });

    await result.current.mutateAsync({
      connectionId: 'conn-1',
      catalogId: 'catalog-1',
      mappings: [{ externalCategoryId: 'ext-1', internalCategoryId: 'int-1' }],
    });

    expect(api.post).toHaveBeenCalledWith('/api/marketplace/mappings/bulk', {
      connectionId: 'conn-1',
      catalogId: 'catalog-1',
      mappings: [{ externalCategoryId: 'ext-1', internalCategoryId: 'int-1' }],
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.marketplace.mappings('conn-1', 'catalog-1'),
    });
  });

  it('useFetchExternalProducersMutation invalidates marketplace producers key', async () => {
    vi.mocked(api.post).mockResolvedValue({ fetched: 4, message: 'ok' } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useFetchExternalProducersMutation(), { wrapper });

    await result.current.mutateAsync({ connectionId: 'conn-1' });

    expect(api.post).toHaveBeenCalledWith('/api/marketplace/producers/fetch', {
      connectionId: 'conn-1',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.marketplace.producers('conn-1'),
    });
  });

  it('useSaveProducerMappingsMutation invalidates producer-mappings key', async () => {
    vi.mocked(api.post).mockResolvedValue({ upserted: 2, message: 'ok' } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveProducerMappingsMutation(), {
      wrapper,
    });

    await result.current.mutateAsync({
      connectionId: 'conn-1',
      mappings: [{ internalProducerId: 'prod-1', externalProducerId: 'ext-prod-1' }],
    });

    expect(api.post).toHaveBeenCalledWith('/api/marketplace/producer-mappings/bulk', {
      connectionId: 'conn-1',
      mappings: [{ internalProducerId: 'prod-1', externalProducerId: 'ext-prod-1' }],
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.marketplace.producerMappings('conn-1'),
    });
  });

  it('useFetchExternalTagsMutation invalidates marketplace tags key', async () => {
    vi.mocked(api.post).mockResolvedValue({ fetched: 7, message: 'ok' } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useFetchExternalTagsMutation(), { wrapper });

    await result.current.mutateAsync({ connectionId: 'conn-1' });

    expect(api.post).toHaveBeenCalledWith('/api/marketplace/tags/fetch', {
      connectionId: 'conn-1',
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.marketplace.tags('conn-1'),
    });
  });

  it('useSaveTagMappingsMutation invalidates tag-mappings key', async () => {
    vi.mocked(api.post).mockResolvedValue({ upserted: 3, message: 'ok' } as never);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveTagMappingsMutation(), { wrapper });

    await result.current.mutateAsync({
      connectionId: 'conn-1',
      mappings: [{ internalTagId: 'tag-1', externalTagId: 'ext-tag-1' }],
    });

    expect(api.post).toHaveBeenCalledWith('/api/marketplace/tag-mappings/bulk', {
      connectionId: 'conn-1',
      mappings: [{ internalTagId: 'tag-1', externalTagId: 'ext-tag-1' }],
    });
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.integrations.marketplace.tagMappings('conn-1'),
    });
  });
});
