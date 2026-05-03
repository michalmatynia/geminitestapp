// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const mocks = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  invalidateProductsMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    patchFormData: vi.fn(),
    delete: (...args: unknown[]) => mocks.deleteMock(...args),
  },
}));

vi.mock('./productCache', () => ({
  invalidateProducts: (...args: unknown[]) => mocks.invalidateProductsMock(...args),
}));

import { useProductImages } from './useProductImages';

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

const createImage = (id: string) => ({
  productId: 'product-1',
  imageFileId: id,
  assignedAt: '2026-04-01T00:00:00.000Z',
  imageFile: {
    id,
    filename: `${id}.jpg`,
    filepath: `/tmp/${id}.jpg`,
    mimetype: 'image/jpeg',
    size: 1234,
    url: `https://example.com/${id}.jpg`,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
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
    images: [createImage('image-file-1')],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('useProductImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteMock.mockResolvedValue(undefined);
    mocks.invalidateProductsMock.mockResolvedValue(undefined);
  });

  it('disconnects an existing image through a direct mutation hook and clears the slot locally', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const { result } = renderHook(() => useProductImages(createProduct()), { wrapper });

    expect(result.current.imageSlots[0]?.type).toBe('existing');

    await act(async () => {
      await result.current.handleSlotDisconnectImage(0);
    });

    expect(mocks.deleteMock).toHaveBeenCalledWith('/api/v2/products/product-1/images/image-file-1');
    expect(mocks.invalidateProductsMock).toHaveBeenCalledWith(queryClient);
    expect(result.current.imageSlots[0]).toBeNull();
  });

  it('compacts refreshed existing images without duplicating and removes the last image on the next click', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);

    const initialProduct = createProduct({
      images: [createImage('image-file-1'), createImage('image-file-2')],
    });

    const { result } = renderHook(() => useProductImages(initialProduct), { wrapper });

    expect(result.current.imageSlots[0]?.slotId).toBe('image-file-1');
    expect(result.current.imageSlots[1]?.slotId).toBe('image-file-2');

    await act(async () => {
      await result.current.handleSlotDisconnectImage(0);
    });

    expect(result.current.imageSlots[0]).toBeNull();
    expect(result.current.imageSlots[1]?.slotId).toBe('image-file-2');

    act(() => {
      result.current.refreshFromProduct(
        createProduct({
          images: [createImage('image-file-2')],
        })
      );
    });

    expect(result.current.imageSlots[0]?.slotId).toBe('image-file-2');
    expect(result.current.imageSlots[1]).toBeNull();

    await act(async () => {
      await result.current.handleSlotDisconnectImage(0);
    });

    expect(mocks.deleteMock).toHaveBeenNthCalledWith(
      1,
      '/api/v2/products/product-1/images/image-file-1'
    );
    expect(mocks.deleteMock).toHaveBeenNthCalledWith(
      2,
      '/api/v2/products/product-1/images/image-file-2'
    );
    expect(result.current.imageSlots[0]).toBeNull();
    expect(result.current.imageSlots[1]).toBeNull();
  });
});
