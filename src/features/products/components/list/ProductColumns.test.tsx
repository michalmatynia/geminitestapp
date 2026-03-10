import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const {
  useProductListActionsContextMock,
  useProductListRowActionsContextMock,
  useProductListRowVisualsContextMock,
} = vi.hoisted(() => ({
  useProductListActionsContextMock: vi.fn(),
  useProductListRowActionsContextMock: vi.fn(),
  useProductListRowVisualsContextMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/products/context/ProductListContext')>();
  return {
    ...actual,
    useProductListActionsContext: () => useProductListActionsContextMock(),
    useProductListRowActionsContext: () => useProductListRowActionsContextMock(),
    useProductListRowVisualsContext: () => useProductListRowVisualsContextMock(),
  };
});

import { getProductColumns } from './ProductColumns';

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
    categoryId: 'category-1',
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

describe('ProductColumns queued badge', () => {
  it('renders the queued badge when the product id is currently queued', () => {
    const product = createProduct();
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set(['product-1']),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set(['product-1']),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByText('Queued')).toBeInTheDocument();
  });

  it('does not render the queued badge when the product id is not queued', () => {
    const product = createProduct();
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.queryByText('Queued')).not.toBeInTheDocument();
  });

  it('renders the resolved category label instead of the category id', () => {
    const product = createProduct({
      categoryId: '507f1f77bcf86cd799439011',
    });
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['507f1f77bcf86cd799439011', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['507f1f77bcf86cd799439011', 'Keychains']]),
    });

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByRole('button', { name: 'Keychains' })).toBeInTheDocument();
    expect(screen.queryByText('507f1f77bcf86cd799439011')).not.toBeInTheDocument();
  });

  it('does not leak opaque category ids when no category label is available', () => {
    const product = createProduct({
      categoryId: '507f1f77bcf86cd799439011',
    });
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map<string, string>(),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map<string, string>(),
    });

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByRole('button', { name: '—' })).toBeInTheDocument();
    expect(screen.queryByText('507f1f77bcf86cd799439011')).not.toBeInTheDocument();
  });
});
