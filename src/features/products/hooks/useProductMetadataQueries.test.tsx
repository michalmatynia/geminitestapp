// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

const { apiGetMock, apiPostMock, apiPutMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
    put: (...args: unknown[]) => apiPutMock(...args),
  },
}));

import {
  useCategoriesForCatalogs,
  useSaveTitleTermMutation,
  useSimpleParameters,
} from './useProductMetadataQueries';

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

describe('useSimpleParameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not request simple parameters without a concrete catalog id', () => {
    const queryClient = createQueryClient();

    renderHook(() => useSimpleParameters('   '), {
      wrapper: createWrapper(queryClient),
    });

    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('requests simple parameters with a normalized catalog id', async () => {
    const queryClient = createQueryClient();
    apiGetMock.mockResolvedValue([]);

    const { result } = renderHook(() => useSimpleParameters(' catalog-1 '), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetMock).toHaveBeenCalledWith('/api/v2/products/simple-parameters', {
      params: {
        catalogId: 'catalog-1',
      },
      cache: 'no-store',
    });
  });
});

describe('useCategoriesForCatalogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a flat-category cache key separate from the grouped batch lookup', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      [...QUERY_KEYS.products.metadata.all, 'categories-batch', ['catalog-1']],
      {
        'catalog-1': [
          {
            id: 'grouped-category',
            name: 'Grouped Category',
            catalogId: 'catalog-1',
            parentId: null,
          },
        ],
      }
    );
    apiGetMock.mockResolvedValue({
      'catalog-1': [
        {
          id: 'flat-category',
          name: 'Flat Category',
          catalogId: 'catalog-1',
          parentId: null,
        },
      ],
    });

    const { result } = renderHook(() => useCategoriesForCatalogs(['catalog-1']), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/products/categories/batch?catalogIds=catalog-1'
    );
    expect(result.current.data).toEqual([
      {
        id: 'flat-category',
        name: 'Flat Category',
        catalogId: 'catalog-1',
        parentId: null,
      },
    ]);
  });
});
