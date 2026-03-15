import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const {
  baseQuickExportButtonMock,
  triggerButtonBarMock,
  useProductListActionsContextMock,
  useProductListHeaderActionsContextMock,
  useProductListRowActionsContextMock,
  useProductListRowVisualsContextMock,
} = vi.hoisted(() => ({
  baseQuickExportButtonMock: vi.fn(),
  triggerButtonBarMock: vi.fn(),
  useProductListActionsContextMock: vi.fn(),
  useProductListHeaderActionsContextMock: vi.fn(),
  useProductListRowActionsContextMock: vi.fn(),
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
    useProductListHeaderActionsContextMock.mockReturnValue({
      showTriggerRunFeedback: true,
      setShowTriggerRunFeedback: vi.fn(),
    });
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
      screen.getByRole('button', { name: 'Open Keychain | 13 cm | Faux Leather' })
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
        name: 'The Vessel | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight',
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
        name: 'Silksong | 13 cm | Faux Leather | Gaming Wallet | Hollow Knight Test',
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
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
      integrationBadgeIds: new Set<string>(),
      integrationBadgeStatuses: new Map<string, string>(),
      traderaBadgeIds: new Set<string>(),
      traderaBadgeStatuses: new Map<string, string>(),
      showTriggerRunFeedback: true,
    });

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
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
      integrationBadgeIds: new Set<string>(),
      integrationBadgeStatuses: new Map<string, string>(),
      traderaBadgeIds: new Set<string>(),
      traderaBadgeStatuses: new Map<string, string>(),
      showTriggerRunFeedback: true,
    });

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

  it('routes the green BL button to the Base export settings modal path', async () => {
    const product = createProduct({
      baseProductId: 'base-123',
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
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      queuedProductIds: new Set<string>(),
      categoryNameById: new Map([['category-1', 'Keychains']]),
      integrationBadgeIds: new Set<string>(['product-1']),
      integrationBadgeStatuses: new Map<string, string>([['product-1', 'active']]),
      traderaBadgeIds: new Set<string>(),
      traderaBadgeStatuses: new Map<string, string>(),
      showTriggerRunFeedback: true,
    });

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    const cell = integrationsColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(await screen.findByRole('button', { name: 'BL' })).toBeInTheDocument();

    const props = baseQuickExportButtonMock.mock.calls
      .map((call) => call[0])
      .find(
        (value) =>
          typeof value === 'object' &&
          value !== null &&
          'showMarketplaceBadge' in value &&
          (value as { showMarketplaceBadge?: boolean }).showMarketplaceBadge === true
      ) as
      | {
          showMarketplaceBadge?: boolean;
          onOpenExportSettings?: (() => void) | undefined;
        }
      | undefined;

    expect(props?.showMarketplaceBadge).toBe(true);
    props?.onOpenExportSettings?.();

    expect(onExportSettingsClick).toHaveBeenCalledWith(product);
    expect(onIntegrationsClick).not.toHaveBeenCalled();
  });
});
