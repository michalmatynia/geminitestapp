// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import { getProductDetailQueryKey } from './productCache';
import { useUpdateProductMutation } from './useProductDataMutations';

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
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: {
      en: 'Original product',
      pl: null,
      de: null,
    },
    description: {
      en: null,
      pl: null,
      de: null,
    },
    name_en: 'Original product',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 5,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: 'catalog-1',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('useUpdateProductMutation', () => {
  beforeEach(() => {
    toastMock.mockReset();
    vi.stubGlobal('navigator', {
      ...window.navigator,
      onLine: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('patches paged product list names immediately and only marks product queries stale', async () => {
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const initialProduct = createProduct();
    const secondProduct = createProduct({
      id: 'product-2',
      sku: 'SKU-2',
      name: { en: 'Second product', pl: null, de: null },
      name_en: 'Second product',
    });
    const savedProduct = createProduct({
      id: initialProduct.id,
      name: { en: 'Renamed product', pl: null, de: null },
      name_en: 'Renamed product',
      updatedAt: '2026-04-01T12:00:00.000Z',
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
    queryClient.setQueryData(getProductDetailQueryKey(initialProduct.id), initialProduct);
    queryClient.setQueryData(QUERY_KEYS.products.detailEdit(initialProduct.id), initialProduct);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(savedProduct), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateProductMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: initialProduct.id,
        data: new FormData(),
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v2/products/${initialProduct.id}`,
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(FormData),
      })
    );
    expect(queryClient.getQueryData(pagedListKey)).toEqual({
      items: [savedProduct, secondProduct],
      total: 2,
    });
    expect(queryClient.getQueryData(getProductDetailQueryKey(initialProduct.id))).toEqual(
      savedProduct
    );
    expect(queryClient.getQueryData(QUERY_KEYS.products.detailEdit(initialProduct.id))).toEqual(
      savedProduct
    );

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.lists(),
      refetchType: 'none',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.counts(),
      refetchType: 'none',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.detail(initialProduct.id),
      refetchType: 'none',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.detailEdit(initialProduct.id),
      refetchType: 'none',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
      refetchType: 'none',
    });

    expect(
      invalidateSpy.mock.calls.some(
        ([options]) =>
          JSON.stringify(options) === JSON.stringify({ queryKey: QUERY_KEYS.products.lists() })
      )
    ).toBe(false);
  });
});
