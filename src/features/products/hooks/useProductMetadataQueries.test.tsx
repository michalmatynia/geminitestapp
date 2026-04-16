// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

const { apiPostMock, apiPutMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: (...args: unknown[]) => apiPostMock(...args),
    put: (...args: unknown[]) => apiPutMock(...args),
  },
}));

import { useSaveTitleTermMutation } from './useProductMetadataQueries';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('useSaveTitleTermMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates all title-term queries after updating a term', async () => {
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    apiPutMock.mockResolvedValue({
      id: 'term-1',
      name: 'Metal',
      description: null,
      catalogId: 'catalog-b',
      type: 'material',
      name_en: 'Metal',
      name_pl: 'Metal',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const { result } = renderHook(() => useSaveTitleTermMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'term-1',
        data: {
          catalogId: 'catalog-b',
          type: 'material',
          name_en: 'Metal',
          name_pl: 'Metal',
        },
      });
    });

    expect(apiPutMock).toHaveBeenCalledWith('/api/v2/products/title-terms/term-1', {
      catalogId: 'catalog-b',
      type: 'material',
      name_en: 'Metal',
      name_pl: 'Metal',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...QUERY_KEYS.products.metadata.all, 'title-terms'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.metadata.all,
    });
  });
});
