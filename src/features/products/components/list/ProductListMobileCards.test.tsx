import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const {
  baseQuickExportButtonMock,
  dynamicComponentIndex,
  triggerButtonBarMock,
  traderaStatusButtonMock,
  useProductListRowActionsContextMock,
  useProductListRowRuntimeMock,
  useProductListRowVisualsContextMock,
  useProductListSelectionContextMock,
} = vi.hoisted(() => ({
  baseQuickExportButtonMock: vi.fn(),
  dynamicComponentIndex: { current: 0 },
  triggerButtonBarMock: vi.fn(),
  traderaStatusButtonMock: vi.fn(),
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
  default: () => {
    const stubIndex = dynamicComponentIndex.current++;
    const DynamicStub = (props: Record<string, unknown>): React.JSX.Element | null => {
      if (stubIndex === 0) {
        triggerButtonBarMock(props);
        return <div data-testid='trigger-button-bar' />;
      }
      if (stubIndex === 1) {
        baseQuickExportButtonMock(props);
        return <button type='button'>BL</button>;
      }
      if (stubIndex === 2) {
        traderaStatusButtonMock(props);
        return <button type='button'>TR</button>;
      }
      return null;
    };

    return DynamicStub;
  },
}));

vi.mock('@/shared/ui', () => ({
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
    dynamicComponentIndex.current = 0;

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
      imageExternalBaseUrl: null,
    });
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'not_started',
      productAiRunFeedback: null,
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
        onOpenExportSettings: expect.any(Function),
        prefetchListings: expect.any(Function),
      })
    );
  });

  it('renders the terminal completed run badge on mobile cards', () => {
    useProductListRowRuntimeMock.mockReturnValue({
      showMarketplaceBadge: true,
      integrationStatus: 'completed',
      showTraderaBadge: false,
      traderaStatus: 'not_started',
      productAiRunFeedback: {
        runId: 'run-completed',
        status: 'completed',
        updatedAt: '2026-03-21T10:00:00.000Z',
        label: 'Completed',
        variant: 'success',
        badgeClassName:
          'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/25',
      },
    });

    render(<ProductListMobileCards />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByText('Queued')).not.toBeInTheDocument();
  });
});
