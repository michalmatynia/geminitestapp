import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

import { useProductListCategories } from './useProductListCategories';

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
    sku: 'KEYCHA1212',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Keychain', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Keychain',
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

describe('useProductListCategories', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it('loads category labels when the product row exposes nested category and catalog data', async () => {
    apiGetMock.mockResolvedValue({
      'catalog-1': [
        {
          id: 'category-1',
          catalogId: 'catalog-1',
          name_en: 'Keychains',
        },
      ],
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () =>
        useProductListCategories({
          data: [
            {
              ...createProduct(),
              category: {
                id: 'category-1',
                catalogId: 'catalog-1',
                name_en: 'Keychains',
              },
            } as ProductWithImages,
          ],
          nameLocale: 'name_en',
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => {
      expect(result.current.categoryNameById.get('category-1')).toBe('Keychains');
    });

    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/products/categories/batch?catalogIds=catalog-1',
      expect.objectContaining({
        timeout: 60_000,
      })
    );
  });
});
