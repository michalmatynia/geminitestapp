import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

let getProductColumns: typeof import('./ProductColumns').getProductColumns;

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
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ getProductColumns } = await import('./ProductColumns'));
  });

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

  it('renders parameter values in the product list name summary', () => {
    const product = createProduct({
      parameters: [
        {
          parameterId: 'size',
          value: '13 cm',
        },
        {
          parameterId: 'material',
          value: '',
          valuesByLanguage: { en: 'Faux Leather' },
        },
      ] as ProductWithImages['parameters'],
    });
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

    expect(
      screen.getByRole('button', { name: 'Keychain | 13 cm | Faux Leather' })
    ).toBeInTheDocument();
  });

  it('falls back to English parameter values when the preferred locale is empty', () => {
    const product = createProduct({
      name_pl: 'Brelok',
      parameters: [
        {
          parameterId: 'material',
          value: '',
          valuesByLanguage: { en: 'Metal' },
        },
      ] as ProductWithImages['parameters'],
    });
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_pl',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Breloki']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_pl',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Breloki']]),
    });

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByRole('button', { name: 'Brelok | Metal' })).toBeInTheDocument();
  });

  it('falls back to nested localized names and legacy localized parameter fields', () => {
    const product = createProduct({
      name: { en: 'Keychain', pl: null, de: null },
      name_en: null,
      parameters: [
        {
          parameterId: 'material',
          value: '',
          value_en: 'Faux Leather',
        },
      ] as unknown as ProductWithImages['parameters'],
    });
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

    expect(screen.getByRole('button', { name: 'Keychain | Faux Leather' })).toBeInTheDocument();
  });

  it('splits malformed composite parameter values into separate list summary segments', () => {
    const product = createProduct({
      name_en: 'The Vessel | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight',
      parameters: [
        {
          parameterId: 'model',
          value: '',
          valuesByLanguage: { pl: 'Pojemnik' },
        },
        {
          parameterId: 'size',
          value: '13 cm',
        },
        {
          parameterId: 'material',
          value: 'Faux Leather',
        },
        {
          parameterId: 'tags',
          value: '',
          valuesByLanguage: { pl: 'Portfel Gamingowy|Hollow Knight' },
        },
      ] as unknown as ProductWithImages['parameters'],
    });
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

    expect(
      screen.getByRole('button', {
        name: 'The Vessel | Pojemnik | 13 cm | Faux Leather | Portfel Gamingowy | Hollow Knight',
      })
    ).toBeInTheDocument();
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

  it('renders the embedded category label when the row exposes a nested category object', () => {
    const product = {
      ...createProduct({
        categoryId: null,
        catalogId: '',
      }),
      category: {
        id: 'category-1',
        catalogId: 'catalog-1',
        name_en: 'Nested Keychains',
      },
    } as ProductWithImages;

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

    expect(screen.getByRole('button', { name: 'Nested Keychains' })).toBeInTheDocument();
  });
});
