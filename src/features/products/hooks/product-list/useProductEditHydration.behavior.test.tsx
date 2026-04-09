// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ApiError } from '@/shared/lib/api-client';

const {
  createSingleQueryV2Mock,
  fetchQueryV2Mock,
  prefetchQueryV2Mock,
  toastMock,
  preloadProductFormChunkMock,
} = vi.hoisted(() => ({
  createSingleQueryV2Mock: vi.fn(),
  fetchQueryV2Mock: vi.fn(),
  prefetchQueryV2Mock: vi.fn(),
  toastMock: vi.fn(),
  preloadProductFormChunkMock: vi.fn(),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createSingleQueryV2: (...args: unknown[]) => createSingleQueryV2Mock(...args),
  fetchQueryV2: (...args: unknown[]) => fetchQueryV2Mock(...args),
  prefetchQueryV2: (...args: unknown[]) => prefetchQueryV2Mock(...args),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => toastMock(...args),
  }),
}));

vi.mock('@/features/products/components/product-form-preload', () => ({
  preloadProductFormChunk: () => preloadProductFormChunkMock(),
}));

import { useProductEditHydration } from './useProductEditHydration';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
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
    categoryId: null,
    catalogId: '',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('useProductEditHydration missing-product cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/admin/products');

    createSingleQueryV2Mock.mockReturnValue({
      data: undefined,
      error: null,
    });
    prefetchQueryV2Mock.mockImplementation(() => () => Promise.resolve(undefined));
    fetchQueryV2Mock.mockImplementation(
      () => () => Promise.reject(new ApiError('Product not found', 404))
    );
  });

  it('closes the editor and clears stale editor query params when a clicked product no longer exists', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const setEditingProduct = vi.fn();
    const setActionError = vi.fn();
    const setRefreshTrigger = vi.fn();
    const clearProductEditorQueryParams = vi.fn();
    const missingProduct = createProduct({ id: 'missing-product' });

    const { result } = renderHook(
      () =>
        useProductEditHydration({
          editingProduct: null,
          setEditingProduct,
          setActionError,
          setRefreshTrigger,
          clearProductEditorQueryParams,
        }),
      { wrapper }
    );

    await act(async () => {
      result.current.handleOpenEditModal(missingProduct);
    });

    expect(setActionError).toHaveBeenCalledWith(null);
    expect(setEditingProduct).toHaveBeenCalledWith(missingProduct);

    await waitFor(() => {
      expect(setEditingProduct).toHaveBeenCalledWith(null);
    });
    expect(clearProductEditorQueryParams).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      'This product no longer exists. Refreshing the list.',
      { variant: 'warning' }
    );
    expect(setRefreshTrigger).toHaveBeenCalledWith(expect.any(Function));
  });

  it('clears a stale openProductId query param when the deep-linked product is missing', async () => {
    window.history.replaceState({}, '', '/admin/products?openProductId=missing-product');

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const setEditingProduct = vi.fn();
    const setActionError = vi.fn();
    const setRefreshTrigger = vi.fn();
    const clearProductEditorQueryParams = vi.fn();

    renderHook(
      () =>
        useProductEditHydration({
          editingProduct: null,
          setEditingProduct,
          setActionError,
          setRefreshTrigger,
          clearProductEditorQueryParams,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(clearProductEditorQueryParams).toHaveBeenCalled();
    });
    expect(setEditingProduct).toHaveBeenCalledWith(null);
    expect(toastMock).toHaveBeenCalledWith(
      'This product no longer exists. Refreshing the list.',
      { variant: 'warning' }
    );
    expect(setRefreshTrigger).toHaveBeenCalledWith(expect.any(Function));
  });

  it('closes an already-open editor when the live detail query reports a missing product', async () => {
    createSingleQueryV2Mock.mockReturnValue({
      data: undefined,
      error: new ApiError('Product not found', 404),
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const setEditingProduct = vi.fn();
    const setActionError = vi.fn();
    const setRefreshTrigger = vi.fn();
    const clearProductEditorQueryParams = vi.fn();

    renderHook(
      () =>
        useProductEditHydration({
          editingProduct: createProduct(),
          setEditingProduct,
          setActionError,
          setRefreshTrigger,
          clearProductEditorQueryParams,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(setEditingProduct).toHaveBeenCalledWith(null);
    });
    expect(clearProductEditorQueryParams).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'This product was deleted or is unavailable.',
      { variant: 'warning' }
    );
    expect(setRefreshTrigger).toHaveBeenCalledWith(expect.any(Function));
  });
});
