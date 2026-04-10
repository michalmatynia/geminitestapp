import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { createProduct, createRowVisualsContext, createRowRuntimeContext, setupProductListMocks } from './ProductColumns.fixtures';

const {
  baseQuickExportButtonMock,
  playwrightStatusButtonMock,
  traderaQuickListButtonMock,
  traderaStatusButtonMock,
  vintedQuickListButtonMock,
  vintedStatusButtonMock,
  triggerButtonBarMock,
  useProductListActionsContextMock,
  useProductListHeaderActionsContextMock,
  useProductListRowActionsContextMock,
  useProductListRowRuntimeMock,
  useProductListRowVisualsContextMock,
} = vi.hoisted(() => ({
  baseQuickExportButtonMock: vi.fn(),
  playwrightStatusButtonMock: vi.fn(),
  traderaQuickListButtonMock: vi.fn(),
  traderaStatusButtonMock: vi.fn(),
  vintedQuickListButtonMock: vi.fn(),
  vintedStatusButtonMock: vi.fn(),
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

vi.mock('./columns/buttons/TraderaQuickListButton', () => ({
  TraderaQuickListButton: (props: Record<string, unknown>) => {
    traderaQuickListButtonMock(props);
    if (props.showTraderaBadge) {
      return null;
    }
    return <button type='button'>T+</button>;
  },
}));

vi.mock('./columns/buttons/VintedQuickListButton', () => ({
  VintedQuickListButton: (props: Record<string, unknown>) => {
    vintedQuickListButtonMock(props);
    if (props.showVintedBadge) {
      return null;
    }
    return <button type='button'>V+</button>;
  },
}));

vi.mock('./columns/buttons/PlaywrightStatusButton', () => ({
  PlaywrightStatusButton: (props: Record<string, unknown>) => {
    playwrightStatusButtonMock(props);
    return <button type='button'>PW</button>;
  },
}));

vi.mock('./columns/buttons/TraderaStatusButton', () => ({
  TraderaStatusButton: (props: Record<string, unknown>) => {
    traderaStatusButtonMock(props);
    return <button type='button'>TR</button>;
  },
}));

vi.mock('./columns/buttons/VintedStatusButton', () => ({
  VintedStatusButton: (props: Record<string, unknown>) => {
    vintedStatusButtonMock(props);
    return <button type='button'>VR</button>;
  },
}));

let getProductColumns: typeof import('./ProductColumns').getProductColumns;



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

  it('uses a pointer cursor for product-list selection checkboxes', () => {
    const selectColumn = getProductColumns().find((column) => column.id === 'select');
    if (
      !selectColumn ||
      typeof selectColumn.header !== 'function' ||
      typeof selectColumn.cell !== 'function'
    ) {
      throw new Error('Select column was not found.');
    }

    const header = selectColumn.header({
      table: {
        getIsAllPageRowsSelected: () => false,
        getIsSomePageRowsSelected: () => false,
        toggleAllPageRowsSelected: vi.fn(),
      } as never,
    });
    const cell = selectColumn.cell({
      row: {
        original: createProduct(),
        getIsSelected: () => false,
        toggleSelected: vi.fn(),
      } as never,
    });

    render(
      <>
        {header}
        {cell}
      </>
    );

    expect(screen.getByLabelText('Select all').className).toContain('cursor-pointer');
    expect(screen.getByLabelText('Select row').className).toContain('cursor-pointer');
  });

  it('renders a duplicate SKU marker in the name summary when the SKU is reused', () => {
    const product = createProduct({
      duplicateSkuCount: 2,
    });
    setupProductListMocks(
      useProductListActionsContextMock,
      useProductListRowActionsContextMock,
      useProductListRowVisualsContextMock
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    render(nameColumn.cell({ row: { original: product } } as never));

    expect(screen.getByText('Duplicate SKU')).toBeInTheDocument();
    expect(screen.getByText('Duplicate SKU')).toHaveAttribute('title', 'SKU used by 2 products');
  });

  it('renders the queued badge when the product id is currently queued', () => {
    const product = createProduct();
    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);
    useProductListActionsContextMock.mockReturnValue({ productNameKey: 'name_en', queuedProductIds: new Set(['product-1']), categoryNameById: new Map([['category-1', 'Keychains']]), });
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

  it('passes Tradera badge runtime into the quick export button', async () => {
    const product = createProduct();
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        showTraderaBadge: false,
        traderaStatus: 'queued',
      })
    );

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    const cell = integrationsColumn.cell({ row: { original: product } } as never);
    render(cell);

    await waitFor(() => {
      expect(traderaQuickListButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          product: expect.objectContaining({ id: 'product-1' }),
          showTraderaBadge: false,
          traderaStatus: 'queued',
          prefetchListings: expect.any(Function),
          onOpenIntegrations: expect.any(Function),
        })
      );
    });
  });

  it('keeps the integrations button order stable when quick-list buttons are visible', async () => {
    const product = createProduct();

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    render(integrationsColumn.cell({ row: { original: product } } as never));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'T+' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'V+' })).toBeInTheDocument();
    });

    const buttonRow = screen.getByRole('button', { name: 'View integrations' }).parentElement;
    if (!buttonRow) {
      throw new Error('Integrations button row was not found.');
    }

    expect(within(buttonRow).getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
      '+',
      'BL',
      'T+',
      'V+',
    ]);
  });

  it('keeps the integrations button order stable when Tradera and Vinted badges replace quick-list buttons', async () => {
    const product = createProduct();
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        showTraderaBadge: true,
        traderaStatus: 'auth_required',
        showVintedBadge: true,
        vintedStatus: 'auth_required',
      })
    );

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    render(integrationsColumn.cell({ row: { original: product } } as never));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'TR' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'VR' })).toBeInTheDocument();
    });

    const buttonRow = screen.getByRole('button', { name: 'View integrations' }).parentElement;
    if (!buttonRow) {
      throw new Error('Integrations button row was not found.');
    }

    expect(within(buttonRow).getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
      '+',
      'BL',
      'TR',
      'VR',
    ]);
  });

  it('scopes Base quick export recovery to the Base listings modal', async () => {
    const product = createProduct();
    const onIntegrationsClick = vi.fn();
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onIntegrationsClick,
      onExportSettingsClick: vi.fn(),
    });

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    render(integrationsColumn.cell({ row: { original: product } } as never));

    await waitFor(() => {
      expect(baseQuickExportButtonMock).toHaveBeenCalled();
    });

    const props = baseQuickExportButtonMock.mock.calls.at(-1)?.[0] as
      | { onOpenIntegrations?: ((recoveryContext?: unknown) => void) | undefined }
      | undefined;

    props?.onOpenIntegrations?.({ source: 'base_quick_export_failed' });

    expect(onIntegrationsClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-1' }),
      { source: 'base_quick_export_failed' },
      'baselinker'
    );
  });

  it('scopes Tradera quick export recovery to the Tradera listings modal', async () => {
    const product = createProduct();
    const onIntegrationsClick = vi.fn();
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onIntegrationsClick,
      onExportSettingsClick: vi.fn(),
    });

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    render(integrationsColumn.cell({ row: { original: product } } as never));

    await waitFor(() => {
      expect(traderaQuickListButtonMock).toHaveBeenCalled();
    });

    const props = traderaQuickListButtonMock.mock.calls.at(-1)?.[0] as
      | { onOpenIntegrations?: ((recoveryContext?: unknown) => void) | undefined }
      | undefined;

    props?.onOpenIntegrations?.({ source: 'tradera_quick_export_failed' });

    expect(onIntegrationsClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-1' }),
      { source: 'tradera_quick_export_failed' },
      'tradera'
    );
  });

  it('passes productId into the Tradera status button when the badge is visible', async () => {
    const product = createProduct();
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        showTraderaBadge: true,
        traderaStatus: 'auth_required',
      })
    );

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    render(integrationsColumn.cell({ row: { original: product } } as never));

    await waitFor(() => {
      expect(traderaStatusButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          status: 'auth_required',
          prefetchListings: expect.any(Function),
          onOpenListings: expect.any(Function),
        })
      );
    });
  });

  it('passes productId into the Vinted status button when the badge is visible', async () => {
    const product = createProduct();
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        showVintedBadge: true,
        vintedStatus: 'auth_required',
      })
    );

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    render(integrationsColumn.cell({ row: { original: product } } as never));

    await waitFor(() => {
      expect(vintedStatusButtonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-1',
          status: 'auth_required',
          prefetchListings: expect.any(Function),
          onOpenListings: expect.any(Function),
        })
      );
    });
  });

  it('prefers the tracker-backed running badge over the queued fallback', () => {
    const product = createProduct();
    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);
    useProductListActionsContextMock.mockReturnValue({ productNameKey: 'name_en', queuedProductIds: new Set(['product-1']), categoryNameById: new Map([['category-1', 'Keychains']]), });
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
    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);
    useProductListActionsContextMock.mockReturnValue({ productNameKey: 'name_en', queuedProductIds: new Set(['product-1']), categoryNameById: new Map([['category-1', 'Keychains']]), });
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
    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);

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
    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);

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
    setupProductListMocks(useProductListActionsContextMock, useProductListRowActionsContextMock, useProductListRowVisualsContextMock);

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

  it('shows the auto-assigned shipping group summary in the name cell', () => {
    const product = createProduct({
      shippingGroupSource: 'category_rule',
      shippingGroupMatchedCategoryRuleIds: ['category-1'],
      shippingGroup: {
        id: 'shipping-group-1',
        name: 'Jewellery 7 EUR',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 7,
        autoAssignCategoryIds: ['category-1'],
      },
    });

    setupProductListMocks(
      useProductListActionsContextMock,
      useProductListRowActionsContextMock,
      useProductListRowVisualsContextMock
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    render(nameColumn.cell({ row: { original: product } } as never));

    expect(screen.getByText('Auto ship: Jewellery 7 EUR')).toBeInTheDocument();
    expect(screen.getByTitle('Auto shipping group: Jewellery 7 EUR via Keychains')).toBeInTheDocument();
  });

  it('shows a shipping-rule conflict summary when multiple automatic rules match', () => {
    const product = createProduct({
      shippingGroupResolutionReason: 'multiple_category_rules',
      shippingGroupMatchedCategoryRuleIds: ['category-1'],
      shippingGroupMatchingGroupNames: ['Jewellery 7 EUR', 'Rings 5 EUR'],
    });

    setupProductListMocks(
      useProductListActionsContextMock,
      useProductListRowActionsContextMock,
      useProductListRowVisualsContextMock
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    render(nameColumn.cell({ row: { original: product } } as never));

    expect(screen.getByText('Ship conflict')).toBeInTheDocument();
    expect(
      screen.getByTitle('Shipping rule conflict: Jewellery 7 EUR, Rings 5 EUR')
    ).toBeInTheDocument();
  });

  it('shows a missing manual shipping-group summary when the assigned group no longer exists', () => {
    const product = createProduct({
      shippingGroupId: 'missing-group',
      shippingGroupResolutionReason: 'manual_missing',
    });

    setupProductListMocks(
      useProductListActionsContextMock,
      useProductListRowActionsContextMock,
      useProductListRowVisualsContextMock
    );

    const nameColumn = getProductColumns().find((column) => column.accessorKey === 'name_en');
    if (!nameColumn || typeof nameColumn.cell !== 'function') {
      throw new Error('Name column cell was not found.');
    }

    render(nameColumn.cell({ row: { original: product } } as never));

    expect(screen.getByText('Ship missing')).toBeInTheDocument();
    expect(screen.getByTitle('Manual shipping group is missing: missing-group')).toBeInTheDocument();
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

  it('renders the imported badge for detached Base imports without sync linkage', () => {
    const product = createProduct({
      baseProductId: null,
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

  it('renders a disabled fallback trigger run feedback toggle when the header context is unavailable', () => {
    useProductListHeaderActionsContextMock.mockImplementation(() => {
      throw new Error('useProductListHeaderActionsContext must be used within a ProductListProvider');
    });

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.header !== 'function') {
      throw new Error('Integrations column header was not found.');
    }

    const header = integrationsColumn.header({} as never);
    render(header);

    const button = screen.getByRole('button', { name: 'Show trigger run pills' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Show Statuses')).toBeInTheDocument();
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

  it('keeps product-row trigger buttons deferred until row runtime is ready', () => {
    const product = createProduct();

    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onIntegrationsClick: vi.fn(),
      onExportSettingsClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue(
      createRowVisualsContext({
        triggerButtonsReady: false,
      })
    );
    useProductListRowRuntimeMock.mockReturnValue(createRowRuntimeContext());

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    const cell = integrationsColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(triggerButtonBarMock).not.toHaveBeenCalled();
  });

  it('renders the Playwright listing status button when the programmable badge is active', async () => {
    const product = createProduct();

    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onIntegrationsClick: vi.fn(),
      onExportSettingsClick: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue(createRowVisualsContext());
    useProductListRowRuntimeMock.mockReturnValue(
      createRowRuntimeContext({
        showPlaywrightProgrammableBadge: true,
        playwrightProgrammableStatus: 'queued',
      })
    );

    const integrationsColumn = getProductColumns().find((column) => column.id === 'integrations');
    if (!integrationsColumn || typeof integrationsColumn.cell !== 'function') {
      throw new Error('Integrations column cell was not found.');
    }

    const cell = integrationsColumn.cell({ row: { original: product } } as never);
    render(cell);

    expect(await screen.findByRole('button', { name: 'PW' })).toBeInTheDocument();
    expect(playwrightStatusButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        prefetchListings: expect.any(Function),
        onOpenListings: expect.any(Function),
      })
    );
  });

});
