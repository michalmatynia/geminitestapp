import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const {
  getProductIdsMock,
  fetchQueryV2Mock,
  toastMock,
  mutateAsyncMock,
} = vi.hoisted(() => ({
  getProductIdsMock: vi.fn(),
  fetchQueryV2Mock: vi.fn(),
  toastMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
}));

vi.mock('@/features/products/api', () => ({
  getProductIds: (...args: unknown[]) => getProductIdsMock(...args),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  fetchQueryV2: (...args: unknown[]) => fetchQueryV2Mock(...args),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/products/hooks/useProductData', () => ({
  useBulkDeleteProductsMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

import { useProductListSelection } from './useProductListSelection';

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
  }) as ProductWithImages;

describe('useProductListSelection', () => {
  beforeEach(() => {
    getProductIdsMock.mockReset();
    fetchQueryV2Mock.mockReset();
    toastMock.mockReset();
    mutateAsyncMock.mockReset();
    fetchQueryV2Mock.mockImplementation(
      (_queryClient: unknown, options: { queryFn: () => Promise<unknown> }) => options.queryFn
    );
  });

  it('uses stable ids pagination defaults for global selection and updates row selection', async () => {
    getProductIdsMock.mockResolvedValue(['product-2', 'product-5']);

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () =>
        useProductListSelection({
          data: [createProduct('product-1')],
          setRefreshTrigger: vi.fn(),
          setActionError: vi.fn(),
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    await act(async () => {
      await result.current.handleSelectAllGlobal({
        page: 7,
        pageSize: 50,
        search: 'lamp',
        catalogId: 'catalog-1',
        searchLanguage: 'name_en',
      });
    });

    expect(getProductIdsMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: 'lamp',
      catalogId: 'catalog-1',
      searchLanguage: 'name_en',
    });
    expect(result.current.rowSelection).toEqual({
      'product-2': true,
      'product-5': true,
    });
    expect(toastMock).toHaveBeenCalledWith('Selected 2 products.', { variant: 'success' });
  });
});
