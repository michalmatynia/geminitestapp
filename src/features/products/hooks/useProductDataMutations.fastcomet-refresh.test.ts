// @vitest-environment jsdom

import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const mocks = vi.hoisted(() => ({
  buildQueuedProductFastCometUploadSource: vi.fn(),
  getProductById: vi.fn(),
  markQueuedProductSource: vi.fn(),
  removeQueuedProductSource: vi.fn(),
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

import {
  clearScheduledProductSaveFastCometRefreshes,
  scheduleProductSaveFastCometRefresh,
} from './useProductDataMutations.fastcomet-refresh';

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

describe('scheduleProductSaveFastCometRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.buildQueuedProductFastCometUploadSource.mockImplementation(
      (imageFileId: string, imageSlotIndex?: number) =>
        `fastcomet-upload:${imageFileId}:${imageSlotIndex ?? 0}`
    );
  });

  afterEach(() => {
    clearScheduledProductSaveFastCometRefreshes();
    vi.useRealTimers();
  });

  it('refreshes product-list caches once a save-queued image is uploaded to FastComet', async () => {
    const queryClient = createQueryClient();
    const savedProduct = createProduct({
      images: [
        {
          productId: 'product-1',
          imageFileId: 'image-file-1',
          assignedAt: '2026-01-01T00:00:00.000Z',
          imageFile: {
            id: 'image-file-1',
            filename: 'photo.webp',
            filepath: '/uploads/products/SKU-1/photo.webp',
            mimetype: 'image/webp',
            size: 1,
            storageProvider: 'local',
          },
        },
      ] as ProductWithImages['images'],
    });
    const fastCometProduct = createProduct({
      images: [
        {
          productId: 'product-1',
          imageFileId: 'image-file-1',
          assignedAt: '2026-01-01T00:00:00.000Z',
          imageFile: {
            id: 'image-file-1',
            filename: 'photo.webp',
            filepath: 'https://sparksofsindri.com/uploads/products/SKU-1/photo.webp',
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
      items: [savedProduct],
      total: 1,
    });
    mocks.getProductById.mockResolvedValue(fastCometProduct);

    scheduleProductSaveFastCometRefresh(queryClient, savedProduct);

    expect(mocks.markQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0',
      180_000
    );

    await vi.advanceTimersByTimeAsync(1500);

    expect(mocks.getProductById).toHaveBeenCalledWith('product-1', { fresh: true });
    expect(queryClient.getQueryData(pagedListKey)).toEqual({
      items: [fastCometProduct],
      total: 1,
    });
    expect(mocks.removeQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0'
    );
  });

  it('does not schedule polling for products that already only reference FastComet images', () => {
    const queryClient = createQueryClient();
    const savedProduct = createProduct({
      images: [
        {
          productId: 'product-1',
          imageFileId: 'image-file-1',
          assignedAt: '2026-01-01T00:00:00.000Z',
          imageFile: {
            id: 'image-file-1',
            filename: 'photo.webp',
            filepath: 'https://sparksofsindri.com/uploads/products/SKU-1/photo.webp',
            mimetype: 'image/webp',
            size: 1,
            storageProvider: 'fastcomet',
          },
        },
      ] as ProductWithImages['images'],
    });

    scheduleProductSaveFastCometRefresh(queryClient, savedProduct);

    expect(mocks.markQueuedProductSource).not.toHaveBeenCalled();
    expect(mocks.getProductById).not.toHaveBeenCalled();
  });
});
