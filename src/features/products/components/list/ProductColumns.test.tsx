import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const {
  baseQuickExportButtonMock,
  triggerButtonBarMock,
  useProductListActionsContextMock,
  useProductListHeaderActionsContextMock,
  useProductListRowActionsContextMock,
  useProductListRowRuntimeMock,
  useProductListRowVisualsContextMock,
} = vi.hoisted(() => ({
  baseQuickExportButtonMock: vi.fn(),
  triggerButtonBarMock: vi.fn(),
  useProductListActionsContextMock: vi.fn(),
  useProductListHeaderActionsContextMock: vi.fn(),
  useProductListRowActionsContextMock: vi.fn(),
  useProductListRowRuntimeMock: vi.fn(),
  useProductListRowVisualsContextMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/products/context/ProductListContext')>();
  return {
    ...actual,
    useProductListActionsContext: () => useProductListActionsContextMock(),
    useProductListHeaderActionsContext: () => useProductListHeaderActionsContextMock(),
    useProductListRowActionsContext: () => useProductListRowActionsContextMock(),
    useProductListRowRuntime: () => useProductListRowRuntimeMock(),
    useProductListRowVisualsContext: () => useProductListRowVisualsContextMock(),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({}),
  };
});

vi.mock('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: (props: Record<string, unknown>) => {
    triggerButtonBarMock(props);
    return null;
  },
}));

vi.mock('./columns/buttons/BaseQuickExportButton', () => ({
  BaseQuickExportButton: (props: Record<string, unknown>) => {
    baseQuickExportButtonMock(props);
    return <button type='button'>BL</button>;
  },
}));

let getProductColumns: typeof import('./ProductColumns').getProductColumns;

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'KEYCHA1212',
    baseProductId: null,
    importSource: null,
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

const createRowVisualsContext = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  productNameKey: 'name_en',
  priceGroups: [],
  currencyCode: 'USD',
  categoryNameById: new Map([['category-1', 'Keychains']]),
  thumbnailSource: 'file',
  showTriggerRunFeedback: true,
  imageExternalBaseUrl: null,
  ...overrides,
});

const createRowRuntimeContext = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  showMarketplaceBadge: false,
  integrationStatus: 'not_started',
  showTraderaBadge: false,
  traderaStatus: 'not_started',
  productAiRunFeedback: null,
  ...overrides,
});

describe('ProductColumns queued badge', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListHeaderActionsContextMock.mockReturnValue({
      showTriggerRunFeedback: true,
      setShowTriggerRunFeedback: vi.fn(),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onIntegrationsClick: vi.fn(),
      onExportSettingsClick: vi.fn(),
    });
    useProductListRowRuntimeMock.mockReturnValue(createRowRuntimeContext());
    useProductListRowVisualsContextMock.mockReturnValue(createRowVisualsContext());
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
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        productAiRunFeedback: {
          runId: '',
          status: 'queued',
          updatedAt: null,
          label: 'Queued',
          variant: 'warning',
          badgeClassName:
            'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/25',
        },
      })
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByText('Queued')).toBeInTheDocument();
  });

  it('prefers the tracker-backed running badge over the queued fallback', () => {
    const product = createProduct();
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set(['product-1']),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        productAiRunFeedback: {
          runId: 'run-1',
          status: 'running',
          updatedAt: '2026-03-21T10:00:00.000Z',
          label: 'Running',
          variant: 'processing',
          badgeClassName:
            'border-cyan-500/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/25',
        },
      })
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.queryByText('Queued')).not.toBeInTheDocument();
  });

  it('renders the terminal completed badge when the tracker reports the finished run status', () => {
    const product = createProduct();
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set(['product-1']),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        productAiRunFeedback: {
          runId: 'run-completed',
          status: 'completed',
          updatedAt: '2026-03-21T10:00:00.000Z',
          label: 'Completed',
          variant: 'success',
          badgeClassName:
            'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/25',
        },
      })
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Queued')).not.toBeInTheDocument();
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
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );

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
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(
      screen.getByRole('button', { name: 'Open Keychain | 13 cm | Faux Leather' })
    ).toBeInTheDocument();
  });

  it('truncates long product titles inside the fixed-width name column', () => {
    const product = createProduct({
      name_en:
        'The Vessel | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight | Collector Edition',
    });
    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
      })
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    const productButton = screen.getByRole('button', {
      name: 'Open The Vessel | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight | Collector Edition',
    });

    expect(productButton.className).toContain('overflow-hidden');
    expect(productButton.className).toContain('text-ellipsis');
    expect(productButton.className).toContain('whitespace-nowrap');
    expect(productButton.classList.contains('w-full')).toBe(false);
    expect(productButton).toHaveAttribute(
      'title',
      'The Vessel | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight | Collector Edition'
    );
    expect(productButton.parentElement?.className).toContain('cursor-text');
    expect(productButton.parentElement?.className).toContain('select-text');
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

    expect(screen.getByRole('button', { name: 'Open Brelok | Metal' })).toBeInTheDocument();
  });

  it('does not fall back to English product titles when the selected locale title is missing', () => {
    const product = createProduct({
      name_en: 'Keychain',
      name_pl: null,
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

    expect(screen.getByRole('button', { name: 'Open product' })).toHaveTextContent('—');
    expect(screen.queryByText('Keychain | Metal')).not.toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: 'Open Keychain | Faux Leather' })).toBeInTheDocument();
  });

  it('preserves an existing composite product title instead of recomposing it from parameters', () => {
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
        name: 'Open The Vessel | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight',
      })
    ).toBeInTheDocument();
  });

  it('does not replace a canonical English composite name with mixed-language parameter fallbacks', () => {
    const product = createProduct({
      sku: 'KEYCHA1217',
      name_en: 'Silksong | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight Test',
      parameters: [
        {
          parameterId: 'size',
          value: '',
          valuesByLanguage: { pl: 'X cm' },
        },
        {
          parameterId: 'material',
          value: 'Metal',
          valuesByLanguage: { en: 'Metal', pl: 'Metal' },
        },
        {
          parameterId: 'type',
          value: '',
          valuesByLanguage: { pl: 'Pin' },
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
      screen.getByRole('button', {
        name: 'Open Silksong | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight Test',
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

  it('does not render the imported badge when a product is only linked by Base id', () => {
    const product = createProduct({
      baseProductId: 'base-123',
      importSource: null,
    });

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.queryByLabelText('Imported product')).not.toBeInTheDocument();
  });

  it('renders the imported badge only for products with explicit import provenance', () => {
    const product = createProduct({
      baseProductId: 'base-123',
      importSource: 'base',
    });

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    const cell = nameColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(screen.getByLabelText('Imported product')).toBeInTheDocument();
  });

  it('renders a global trigger run feedback toggle in the integrations header', () => {
    const setShowTriggerRunFeedback = vi.fn();
    useProductListHeaderActionsContextMock.mockReturnValue({
      showTriggerRunFeedback: true,
      setShowTriggerRunFeedback,
    });

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.header !== 'function') {
      throw new Error('Integrations column header was not found.');
    }

    const header = integrationsColumn.header({} as never);
    render(header);

    fireEvent.click(screen.getByRole('button', { name: 'Hide trigger run pills' }));

    expect(setShowTriggerRunFeedback).toHaveBeenCalledWith(false);
    expect(screen.getByText('Hide Statuses')).toBeInTheDocument();
  });

  it('pins fixed widths for the columns that must stay uniform across pages', () => {
    const columns = getProductColumns();

    expect(columns.find((column) => column.id === 'select')?.size).toBe(48);
    expect(columns.find((column) => column.id === 'select')?.meta).toMatchObject({ widthPx: 48 });
    expect(columns.find((column) => column.accessorKey === 'images')?.size).toBe(84);
    expect(columns.find((column) => column.accessorKey === 'images')?.meta).toMatchObject({
      widthPx: 84,
    });
    expect(columns.find((column) => column.accessorKey === 'price')?.size).toBe(140);
    expect(columns.find((column) => column.accessorKey === 'price')?.meta).toMatchObject({
      widthPx: 140,
    });
    expect(columns.find((column) => column.accessorKey === 'stock')?.size).toBe(88);
    expect(columns.find((column) => column.accessorKey === 'stock')?.meta).toMatchObject({
      widthPx: 88,
    });
    expect(columns.find((column) => column.accessorKey === 'createdAt')?.size).toBe(200);
    expect(columns.find((column) => column.accessorKey === 'createdAt')?.meta).toMatchObject({
      widthPx: 200,
    });
    expect(columns.find((column) => column.id === 'integrations')?.size).toBe(220);
    expect(columns.find((column) => column.id === 'integrations')?.meta).toMatchObject({
      widthPx: 220,
    });
    expect(columns.find((column) => column.id === 'actions')?.size).toBe(64);
    expect(columns.find((column) => column.id === 'actions')?.meta).toMatchObject({
      widthPx: 64,
    });
  });

  it('keeps the BL quick-export button visible when AI Path row triggers render nothing', async () => {
    const product = createProduct();
    const onIntegrationsClick = vi.fn();
    const onExportSettingsClick = vi.fn();

    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onIntegrationsClick,
      onExportSettingsClick,
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
        showTriggerRunFeedback: true,
      })
    );
    useProductListRowRuntimeMock.mockReturnValue(createRowRuntimeContext());

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    const cell = integrationsColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(await screen.findByRole('button', { name: 'BL' })).toBeInTheDocument();
    expect(baseQuickExportButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        product,
      })
    );
  });

  it('passes the current row publication state into the product-row trigger snapshot', async () => {
    const product = createProduct({
      published: false,
    });
    const onIntegrationsClick = vi.fn();
    const onExportSettingsClick = vi.fn();

    useProductListActionsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onIntegrationsClick,
      onExportSettingsClick,
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        categoryNameById: new Map([['category-1', 'Keychains']]),
        showTriggerRunFeedback: true,
      })
    );
    useProductListRowRuntimeMock.mockReturnValue(createRowRuntimeContext());

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    const cell = integrationsColumn.cell({ row: { original: product } } as never);
    render(cell);

    await waitFor(() => {
      expect(triggerButtonBarMock).toHaveBeenCalled();
    });

    const triggerBarProps = triggerButtonBarMock.mock.calls.at(-1)?.[0] as
      | {
          entityId?: string;
          getEntityJson?: (() => Record<string, unknown> | null) | undefined;
        }
      | undefined;

    const entityJson = triggerBarProps?.getEntityJson?.();

    expect(triggerBarProps?.entityId).toBe('product-1');
    expect(entityJson).toEqual(
      expect.objectContaining({
        id: 'product-1',
        published: false,
        status: 'draft',
        publicationStatus: 'draft',
      })
    );
  });

});
