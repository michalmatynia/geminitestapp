// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const mocks = vi.hoisted(() => ({
  patchMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: (...args: unknown[]) => mocks.patchMock(...args),
    patchFormData: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useUpdateProductField } from './useProductsMutations';

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

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    categoryId: 'category-1',
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    price: 10,
    stock: 5,
    weight: null,
    ean: null,
    producers: [],
    images: [],
    imageLinks: [],
    imageBase64s: [],
    parameters: [],
    tags: [],
    catalogs: [],
    baseProductId: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('useUpdateProductField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges the saved product into list caches and only marks list queries stale without refetching them', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const initialProduct = createProduct();
    const secondProduct = createProduct({
      id: 'product-2',
      sku: 'SKU-002',
      name_en: 'Product 2',
    });
    const savedProduct = createProduct({
      id: 'product-1',
      price: 12.5,
      updatedAt: '2026-03-23T12:00:00.000Z',
    });

    const pagedListKey = [
      ...QUERY_KEYS.products.lists(),
      'paged',
      { filters: { page: 1, pageSize: 20 } },
    ] as const;

    queryClient.setQueryData(pagedListKey, {
      items: [initialProduct, secondProduct],
      total: 2,
    });
    queryClient.setQueryData(QUERY_KEYS.products.detail(initialProduct.id), initialProduct);
    queryClient.setQueryData(QUERY_KEYS.products.detailEdit(initialProduct.id), initialProduct);

    mocks.patchMock.mockResolvedValue(savedProduct);

    const { result } = renderHook(() => useUpdateProductField(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: initialProduct.id,
        field: 'price',
        value: 12.5,
      });
    });

    expect(mocks.patchMock).toHaveBeenCalledWith(
      `/api/v2/products/${initialProduct.id}`,
      { price: 12.5 }
    );
    expect(queryClient.getQueryData(pagedListKey)).toEqual({
      items: [savedProduct, secondProduct],
      total: 2,
    });
    expect(queryClient.getQueryData(QUERY_KEYS.products.detail(initialProduct.id))).toEqual(
      savedProduct
    );
    expect(queryClient.getQueryData(QUERY_KEYS.products.detailEdit(initialProduct.id))).toEqual(
      savedProduct
    );

    const listInvalidations = invalidateSpy.mock.calls.filter(([options]) => {
      return JSON.stringify(options?.queryKey) === JSON.stringify(QUERY_KEYS.products.lists());
    });
    const detailInvalidations = invalidateSpy.mock.calls.filter(([options]) => {
      return (
        JSON.stringify(options?.queryKey) ===
          JSON.stringify(QUERY_KEYS.products.detail(initialProduct.id)) ||
        JSON.stringify(options?.queryKey) ===
          JSON.stringify(QUERY_KEYS.products.detailEdit(initialProduct.id))
      );
    });

    expect(listInvalidations).toHaveLength(1);
    expect(listInvalidations[0]?.[0]).toMatchObject({
      queryKey: QUERY_KEYS.products.lists(),
      refetchType: 'none',
    });
    expect(detailInvalidations).toHaveLength(2);
    detailInvalidations.forEach(([options]) => {
      expect(options).toMatchObject({ refetchType: 'none' });
    });
  });

  it('rolls back paged list and detail caches when a quick field update fails', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const initialProduct = createProduct();
    const secondProduct = createProduct({
      id: 'product-2',
      sku: 'SKU-002',
      name_en: 'Product 2',
    });

    const pagedListKey = [
      ...QUERY_KEYS.products.lists(),
      'paged',
      { filters: { page: 1, pageSize: 20 } },
    ] as const;

    queryClient.setQueryData(pagedListKey, {
      items: [initialProduct, secondProduct],
      total: 2,
    });
    queryClient.setQueryData(QUERY_KEYS.products.detail(initialProduct.id), initialProduct);
    queryClient.setQueryData(QUERY_KEYS.products.detailEdit(initialProduct.id), initialProduct);

    mocks.patchMock.mockRejectedValue(new Error('save failed'));

    const { result } = renderHook(() => useUpdateProductField(), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: initialProduct.id,
        field: 'price',
        value: 12.5,
      })
    ).rejects.toThrow('save failed');

    expect(queryClient.getQueryData(pagedListKey)).toEqual({
      items: [initialProduct, secondProduct],
      total: 2,
    });
    expect(queryClient.getQueryData(QUERY_KEYS.products.detail(initialProduct.id))).toEqual(
      initialProduct
    );
    expect(queryClient.getQueryData(QUERY_KEYS.products.detailEdit(initialProduct.id))).toEqual(
      initialProduct
    );
  });
});
