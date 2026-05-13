// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { getProductDetailQueryKey } from '@/features/products/hooks/productCache';

const mocks = vi.hoisted(() => ({
  buildQueuedProductFastCometUploadSource: vi.fn(),
  getProductById: vi.fn(),
  markQueuedProductSource: vi.fn(),
  removeQueuedProductSource: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/features/products/api/products', () => ({
  getProductById: (...args: unknown[]) => mocks.getProductById(...args),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  buildQueuedProductFastCometUploadSource: (...args: unknown[]) =>
    mocks.buildQueuedProductFastCometUploadSource(...args),
  markQueuedProductSource: (...args: unknown[]) => mocks.markQueuedProductSource(...args),
  removeQueuedProductSource: (...args: unknown[]) => mocks.removeQueuedProductSource(...args),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import { useFastCometUploadRuntimeCallbacks } from './ProductImagesFastCometRuntime';

const uploadEvent = {
  filename: 'photo.webp',
  imageFileId: 'image-file-1',
  imageSlotIndex: 0,
  productId: 'product-1',
};

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const renderFastCometRuntimeHook = () => {
  const queryClient = createQueryClient();
  const hook = renderHook(() => useFastCometUploadRuntimeCallbacks(), {
    wrapper: createWrapper(queryClient),
  });
  return { ...hook, queryClient };
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
    name: { en: 'Product', pl: null, de: null },
    description: { en: null, pl: null, de: null },
    name_en: 'Product',
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
    catalogId: 'catalog-1',
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

describe('useFastCometUploadRuntimeCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildQueuedProductFastCometUploadSource.mockReturnValue(
      'fastcomet-upload:image-file-1:0'
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks FastComet uploads as queued product operations while Redis work is pending', () => {
    const { result } = renderFastCometRuntimeHook();

    act(() => {
      result.current.onFastCometUploadStart?.(uploadEvent);
    });

    expect(mocks.buildQueuedProductFastCometUploadSource).toHaveBeenCalledWith(
      'image-file-1',
      0
    );
    expect(mocks.markQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0',
      120_000
    );
    expect(mocks.toast).toHaveBeenCalledWith('FastComet upload started.', {
      duration: 3000,
      variant: 'info',
    });
  });

  it('removes queued FastComet operations when the upload succeeds', () => {
    const { result } = renderFastCometRuntimeHook();

    act(() => {
      result.current.onFastCometUploadSuccess?.({
        ...uploadEvent,
        imageFile: {
          id: 'image-file-1',
          filename: 'photo.webp',
          filepath: 'https://sparksofsindri.com/photo.webp',
          storageProvider: 'fastcomet',
        },
      });
    });

    expect(mocks.removeQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0'
    );
    expect(mocks.toast).toHaveBeenCalledWith('Image uploaded to FastComet.', {
      variant: 'success',
    });
  });

  it('syncs the updated product into product-list caches when FastComet upload succeeds', () => {
    const { result, queryClient } = renderFastCometRuntimeHook();
    const initialProduct = createProduct();
    const updatedProduct = createProduct({
      images: [
        {
          productId: 'product-1',
          imageFileId: 'image-file-1',
          assignedAt: '2026-01-01T00:00:00.000Z',
          imageFile: {
            id: 'image-file-1',
            filename: 'photo.webp',
            filepath: 'https://sparksofsindri.com/photo.webp',
            mimetype: 'image/webp',
            size: 1,
            storageProvider: 'fastcomet',
            metadata: { storageSource: 'fastcomet' },
          },
        },
      ] as ProductWithImages['images'],
    });
    const pagedListKey = [
      ...QUERY_KEYS.products.lists(),
      'paged',
      { filters: { page: 1, pageSize: 20 } },
    ] as const;

    queryClient.setQueryData(pagedListKey, {
      items: [initialProduct],
      total: 1,
    });
    queryClient.setQueryData(getProductDetailQueryKey(initialProduct.id), initialProduct);

    act(() => {
      result.current.onFastCometUploadSuccess?.({
        ...uploadEvent,
        imageFile: updatedProduct.images[0].imageFile,
        product: updatedProduct,
      });
    });

    expect(queryClient.getQueryData(pagedListKey)).toEqual({
      items: [updatedProduct],
      total: 1,
    });
    expect(queryClient.getQueryData(getProductDetailQueryKey(initialProduct.id))).toEqual(
      updatedProduct
    );
  });

  it('refreshes product-list caches after a queued FastComet upload starts', async () => {
    vi.useFakeTimers();
    const { result, queryClient } = renderFastCometRuntimeHook();
    const initialProduct = createProduct();
    const updatedProduct = createProduct({
      images: [
        {
          productId: 'product-1',
          imageFileId: 'image-file-1',
          assignedAt: '2026-01-01T00:00:00.000Z',
          imageFile: {
            id: 'image-file-1',
            filename: 'photo.webp',
            filepath: 'https://sparksofsindri.com/photo.webp',
            mimetype: 'image/webp',
            size: 1,
            storageProvider: 'fastcomet',
            metadata: { storageSource: 'fastcomet' },
          },
        },
      ] as ProductWithImages['images'],
    });
    const pagedListKey = [
      ...QUERY_KEYS.products.lists(),
      'paged',
      { filters: { page: 1, pageSize: 20 } },
    ] as const;

    mocks.getProductById.mockResolvedValue(updatedProduct);
    queryClient.setQueryData(pagedListKey, {
      items: [initialProduct],
      total: 1,
    });

    act(() => {
      result.current.onFastCometUploadStart?.(uploadEvent);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(mocks.getProductById).toHaveBeenCalledWith('product-1', { fresh: true });
    expect(queryClient.getQueryData(pagedListKey)).toEqual({
      items: [updatedProduct],
      total: 1,
    });
  });

  it('removes queued FastComet operations when the upload fails', () => {
    const { result } = renderFastCometRuntimeHook();
    const error = new Error('Product FastComet image uploads require Redis runtime.');

    act(() => {
      result.current.onFastCometUploadError?.({
        ...uploadEvent,
        error,
      });
    });

    expect(mocks.removeQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0'
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      'Product FastComet image uploads require Redis runtime.',
      { error, variant: 'error' }
    );
  });

  it('surfaces FastComet configuration errors without leaving the queued marker', () => {
    const { result } = renderFastCometRuntimeHook();
    const error = new Error('FastComet storage is not configured. Enter SERVER.');

    act(() => {
      result.current.onFastCometUploadError?.({
        ...uploadEvent,
        error,
      });
    });

    expect(mocks.removeQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0'
    );
    expect(result.current.fastCometConfigError).toBe(
      'FastComet storage is not configured. Enter SERVER.'
    );
    expect(mocks.toast).not.toHaveBeenCalled();

    act(() => {
      result.current.clearFastCometConfigError();
    });

    expect(result.current.fastCometConfigError).toBeNull();
  });
});
