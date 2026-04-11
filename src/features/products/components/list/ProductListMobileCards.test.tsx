import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const {
  baseQuickExportButtonMock,
  playwrightStatusButtonMock,
  traderaQuickListButtonMock,
  vintedQuickListButtonMock,
  triggerButtonBarMock,
  traderaStatusButtonMock,
  vintedStatusButtonMock,
  useProductListRowActionsContextMock,
  useProductListRowRuntimeMock,
  useProductListRowVisualsContextMock,
  useProductListSelectionContextMock,
} = vi.hoisted(() => ({
  baseQuickExportButtonMock: vi.fn(),
  playwrightStatusButtonMock: vi.fn(),
  traderaQuickListButtonMock: vi.fn(),
  vintedQuickListButtonMock: vi.fn(),
  triggerButtonBarMock: vi.fn(),
  traderaStatusButtonMock: vi.fn(),
  vintedStatusButtonMock: vi.fn(),
  useProductListRowActionsContextMock: vi.fn(),
  useProductListRowRuntimeMock: vi.fn(),
  useProductListRowVisualsContextMock: vi.fn(),
  useProductListSelectionContextMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/products/context/ProductListContext')>();
  return {
    ...actual,
    useProductListRowActionsContext: () => useProductListRowActionsContextMock(),
    useProductListRowRuntime: () => useProductListRowRuntimeMock(),
    useProductListRowVisualsContext: () => useProductListRowVisualsContextMock(),
    useProductListSelectionContext: () => useProductListSelectionContextMock(),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({}),
  };
});

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) => {
    const loaderSource = String(loader);
    const DynamicStub = (props: Record<string, unknown>): React.JSX.Element | null => {
      if (loaderSource.includes('TriggerButtonBar')) {
        triggerButtonBarMock(props);
        return <div data-testid='trigger-button-bar' />;
      }
      if (loaderSource.includes('BaseQuickExportButton')) {
        baseQuickExportButtonMock(props);
        return <button type='button'>BL</button>;
      }
      if (loaderSource.includes('TraderaQuickListButton')) {
        traderaQuickListButtonMock(props);
        if (props.showTraderaBadge) {
          return null;
        }
        return <button type='button'>T+</button>;
      }
      if (loaderSource.includes('VintedQuickListButton')) {
        vintedQuickListButtonMock(props);
        if (props.showVintedBadge) {
          return null;
        }
        return <button type='button'>V+</button>;
      }
      if (loaderSource.includes('TraderaStatusButton')) {
        traderaStatusButtonMock(props);
        return <button type='button'>TR</button>;
      }
      if (loaderSource.includes('VintedStatusButton')) {
        vintedStatusButtonMock(props);
        return <button type='button'>VR</button>;
      }
      if (loaderSource.includes('PlaywrightStatusButton')) {
        playwrightStatusButtonMock(props);
        return <button type='button'>PW</button>;
      }
      return null;
    };

    return DynamicStub;
  },
}));

vi.mock('@/features/products/ui', () => ({
  ActionMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children?: React.ReactNode;
    onSelect?: (event: Event) => void;
  }) => (
    <button
      type='button'
      onClick={() =>
        onSelect?.({
          preventDefault() {},
        } as Event)
      }
    >
      {children}
    </button>
  ),
}));

vi.mock('@/features/products/components/cells/ProductImageCell', () => ({
  ProductImageCell: ({ productName }: { productName: string }) => <div>{productName}</div>,
}));

let ProductListMobileCards: typeof import('./ProductListMobileCards').ProductListMobileCards;

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
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
    stock: 3,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    archived: false,
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

describe('ProductListMobileCards', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    useProductListSelectionContextMock.mockReturnValue({
      data: [createProduct()],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onProductEditClick: vi.fn(),
      onProductDeleteClick: vi.fn(),
      onDuplicateProduct: vi.fn(),
      onIntegrationsClick: vi.fn(),
      onExportSettingsClick: vi.fn(),
      onPrefetchProductDetail: vi.fn(),
    });
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      priceGroups: [],
      currencyCode: 'USD',
      categoryNameById: new Map([['category-1', 'Keychains']]),
      thumbnailSource: 'file',
      showTriggerRunFeedback: true,
      triggerButtonsReady: true,
      imageExternalBaseUrl: null,
    });
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'not_started',
      showVintedBadge: false,
      vintedStatus: 'not_started',
      showPlaywrightProgrammableBadge: false,
      playwrightProgrammableStatus: 'not_started',
      productAiRunFeedback: null,
      productScanRunFeedback: null,
    });

    ({ ProductListMobileCards } = await import('./ProductListMobileCards'));
  });

  it('passes the resolved mobile row runtime status into the shared Base export button', () => {
    render(<ProductListMobileCards />);

    expect(screen.getByRole('button', { name: 'BL' })).toBeInTheDocument();
    expect(baseQuickExportButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        product: expect.objectContaining({ id: 'product-1' }),
        status: 'completed',
        showMarketplaceBadge: true,
        onOpenIntegrations: expect.any(Function),
        prefetchListings: expect.any(Function),
      })
    );
  });

  it('uses a pointer cursor for mobile product-list selection checkboxes', () => {
    render(<ProductListMobileCards />);

    expect(screen.getByLabelText('Select Keychain').className).toContain('cursor-pointer');
  });

  it('renders a duplicate SKU marker on mobile cards when the SKU is reused', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
          duplicateSkuCount: 2,
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Duplicate SKU')).toBeInTheDocument();
    expect(screen.getByText('Duplicate SKU')).toHaveAttribute('title', 'SKU used by 2 products');
  });

  it('passes Tradera badge runtime into the mobile quick export button', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'queued',
      showPlaywrightProgrammableBadge: false,
      playwrightProgrammableStatus: 'not_started',
      productAiRunFeedback: null,
    });

    render(<ProductListMobileCards />);

    expect(screen.getByRole('button', { name: 'T+' })).toBeInTheDocument();
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

  it('keeps the mobile integrations button order stable when quick-list buttons are visible', () => {
    render(<ProductListMobileCards />);

    const buttonRow = screen.getByRole('button', { name: 'View integrations' }).parentElement;
    if (!buttonRow) {
      throw new Error('Mobile integrations button row was not found.');
    }

    expect(within(buttonRow).getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
      '+',
      'BL',
      'T+',
      'V+',
    ]);
  });

  it('keeps the mobile integrations button order stable when Tradera and Vinted badges replace quick-list buttons', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: true,
      traderaStatus: 'auth_required',
      showVintedBadge: true,
      vintedStatus: 'auth_required',
      showPlaywrightProgrammableBadge: false,
      playwrightProgrammableStatus: 'not_started',
      productAiRunFeedback: null,
    });

    render(<ProductListMobileCards />);

    const buttonRow = screen.getByRole('button', { name: 'View integrations' }).parentElement;
    if (!buttonRow) {
      throw new Error('Mobile integrations button row was not found.');
    }

    expect(within(buttonRow).getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
      '+',
      'BL',
      'TR',
      'VR',
    ]);
  });

  it('scopes mobile Base quick export recovery to the Base listings modal', () => {
    const onIntegrationsClick = vi.fn();
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onProductEditClick: vi.fn(),
      onProductDeleteClick: vi.fn(),
      onDuplicateProduct: vi.fn(),
      onIntegrationsClick,
      onExportSettingsClick: vi.fn(),
      onPrefetchProductDetail: vi.fn(),
    });

    render(<ProductListMobileCards />);

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

  it('scopes mobile Tradera quick export recovery to the Tradera listings modal', () => {
    const onIntegrationsClick = vi.fn();
    useProductListRowActionsContextMock.mockReturnValue({
      onProductNameClick: vi.fn(),
      onProductEditClick: vi.fn(),
      onProductDeleteClick: vi.fn(),
      onDuplicateProduct: vi.fn(),
      onIntegrationsClick,
      onExportSettingsClick: vi.fn(),
      onPrefetchProductDetail: vi.fn(),
    });

    render(<ProductListMobileCards />);

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

  it('passes productId into the mobile Tradera status button when the badge is visible', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: true,
      traderaStatus: 'auth_required',
      showPlaywrightProgrammableBadge: false,
      playwrightProgrammableStatus: 'not_started',
      productAiRunFeedback: null,
    });

    render(<ProductListMobileCards />);

    expect(traderaStatusButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        status: 'auth_required',
        prefetchListings: expect.any(Function),
        onOpenListings: expect.any(Function),
      })
    );
  });

  it('passes productId into the mobile Vinted status button when the badge is visible', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'not_started',
      showVintedBadge: true,
      vintedStatus: 'auth_required',
      showPlaywrightProgrammableBadge: false,
      playwrightProgrammableStatus: 'not_started',
      productAiRunFeedback: null,
    });

    render(<ProductListMobileCards />);

    expect(vintedStatusButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        status: 'auth_required',
        prefetchListings: expect.any(Function),
        onOpenListings: expect.any(Function),
      })
    );
  });

  it('renders the terminal completed run badge on mobile cards', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'not_started',
      showVintedBadge: false,
      vintedStatus: 'not_started',
      showPlaywrightProgrammableBadge: false,
      playwrightProgrammableStatus: 'not_started',
      productAiRunFeedback: {
        runId: 'run-completed',
        status: 'completed',
        updatedAt: '2026-03-21T10:00:00.000Z',
        label: 'Completed',
        variant: 'success',
        badgeClassName:
          'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/25',
      },
      productScanRunFeedback: null,
    });

    render(<ProductListMobileCards />);

    const pill = screen.getByText('Completed');
    expect(pill).toBeInTheDocument();
    expect(pill.closest('[data-activity-kind]')).toHaveAttribute(
      'data-activity-kind',
      'trigger-button'
    );
    expect(screen.queryByText('Queued')).not.toBeInTheDocument();
  });

  it('renders the scan feedback pill on mobile cards', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'not_started',
      showVintedBadge: false,
      vintedStatus: 'not_started',
      showPlaywrightProgrammableBadge: false,
      playwrightProgrammableStatus: 'not_started',
      productAiRunFeedback: null,
      productScanRunFeedback: {
        scanId: 'scan-1',
        status: 'running',
        updatedAt: '2026-04-11T12:00:00.000Z',
        label: 'Running',
        variant: 'processing',
        badgeClassName:
          'border-cyan-500/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/25',
      },
    });

    render(<ProductListMobileCards />);

    const pill = screen.getByText('Running');
    expect(pill.closest('[data-activity-kind]')).toHaveAttribute(
      'data-activity-kind',
      'scan'
    );
  });

  it('does not render the imported badge when a product only has Base linkage', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
          baseProductId: 'base-123',
          importSource: null,
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.queryByText('Imported')).not.toBeInTheDocument();
  });

  it('renders the imported badge for products with explicit import provenance', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
          baseProductId: 'base-123',
          importSource: 'base',
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('renders the imported badge for detached Base imports without a linked Base id', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
          baseProductId: null,
          importSource: 'base',
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('renders the archived badge for archived products', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
          archived: true,
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows the auto-assigned shipping group on mobile cards', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
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
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Auto shipping: Jewellery 7 EUR')).toBeInTheDocument();
    expect(screen.getByText('Auto via: Keychains')).toBeInTheDocument();
  });

  it('shows a shipping-rule conflict on mobile cards', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
          shippingGroupResolutionReason: 'multiple_category_rules',
          shippingGroupMatchingGroupNames: ['Jewellery 7 EUR', 'Rings 5 EUR'],
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Ship conflict')).toBeInTheDocument();
    expect(screen.getByText('Jewellery 7 EUR, Rings 5 EUR')).toBeInTheDocument();
  });

  it('shows a missing manual shipping-group on mobile cards', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [
        createProduct({
          shippingGroupId: 'missing-group',
          shippingGroupResolutionReason: 'manual_missing',
        }),
      ],
      rowSelection: {},
      setRowSelection: vi.fn(),
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Ship missing')).toBeInTheDocument();
    expect(screen.getByText('missing-group')).toBeInTheDocument();
  });

  it('renders the programmable Playwright status button on mobile cards', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'not_started',
      showPlaywrightProgrammableBadge: true,
      playwrightProgrammableStatus: 'queued',
      productAiRunFeedback: null,
    });

    render(<ProductListMobileCards />);

    expect(screen.getByRole('button', { name: 'PW' })).toBeInTheDocument();
    expect(playwrightStatusButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        prefetchListings: expect.any(Function),
        onOpenListings: expect.any(Function),
      })
    );
  });

  it('keeps mobile trigger buttons deferred until row runtime is ready', () => {
    useProductListRowVisualsContextMock.mockReturnValue({
      productNameKey: 'name_en',
      priceGroups: [],
      currencyCode: 'USD',
      categoryNameById: new Map([['category-1', 'Keychains']]),
      thumbnailSource: 'file',
      showTriggerRunFeedback: true,
      triggerButtonsReady: false,
      imageExternalBaseUrl: null,
    });

    render(<ProductListMobileCards />);

    expect(screen.queryByTestId('trigger-button-bar')).toBeNull();
    expect(triggerButtonBarMock).not.toHaveBeenCalled();
  });
});
