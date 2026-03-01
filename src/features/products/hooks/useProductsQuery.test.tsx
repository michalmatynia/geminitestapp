import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const { getProductsWithCountMock } = vi.hoisted(() => ({
  getProductsWithCountMock: vi.fn(),
}));

vi.mock('@/features/products/api/products', () => ({
  getProducts: vi.fn(),
  countProducts: vi.fn(),
  getProductsWithCount: (...args: unknown[]) => getProductsWithCountMock(...args),
}));

import { useProductsWithCount } from './useProductsQuery';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createProduct = (id: string): ProductWithImages =>
  ({
    id,
    sku: `SKU-${id}`,
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: `Product ${id}`, pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: `Product ${id}`,
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    catalogId: '',
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    images: [],
    catalogs: [],
    categoryId: null,
    tags: [],
    producers: [],
  }) as ProductWithImages;

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useProductsWithCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps previous page data visible while next page is loading', async () => {
    const deferred = createDeferred<{ products: ProductWithImages[]; total: number }>();
    getProductsWithCountMock.mockImplementation((filters: { page?: number }) => {
      if (filters.page === 1) {
        return Promise.resolve({
          products: [createProduct('page-1')],
          total: 4,
        });
      }
      if (filters.page === 2) {
        return deferred.promise;
      }
      return Promise.resolve({ products: [], total: 0 });
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, rerender } = renderHook(
      ({ page }) =>
        useProductsWithCount({
          page,
          pageSize: 2,
        }),
      {
        wrapper,
        initialProps: { page: 1 },
      }
    );

    await waitFor(() => {
      expect(result.current.products[0]?.id).toBe('page-1');
    });

    rerender({ page: 2 });

    expect(result.current.products[0]?.id).toBe('page-1');
    expect(result.current.isFetching).toBe(true);

    deferred.resolve({
      products: [createProduct('page-2')],
      total: 4,
    });

    await waitFor(() => {
      expect(result.current.products[0]?.id).toBe('page-2');
    });
  });

  it('prefetches the next page when there are more pages available', async () => {
    getProductsWithCountMock.mockImplementation((filters: { page?: number }) => {
      if (filters.page === 1) {
        return Promise.resolve({
          products: [createProduct('page-1')],
          total: 4,
        });
      }
      if (filters.page === 2) {
        return Promise.resolve({
          products: [createProduct('page-2')],
          total: 4,
        });
      }
      return Promise.resolve({ products: [], total: 0 });
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useProductsWithCount({
          page: 1,
          pageSize: 2,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(getProductsWithCountMock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 2 })
      );
    });
  });
});
