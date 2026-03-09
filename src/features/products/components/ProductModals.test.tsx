import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { type ReactNode } from 'react';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductDraft, ProductWithImages } from '@/shared/contracts/products';

const { useProductListModalsContextMock } = vi.hoisted(() => ({
  useProductListModalsContextMock: vi.fn(),
}));

const {
  useProductFormCoreMock,
  triggerButtonBarMock,
  getNextProviderInstanceIdMock,
  resetProviderInstanceCounterMock,
} = vi.hoisted(() => {
  let providerInstanceCounter = 0;

  return {
  useProductFormCoreMock: vi.fn(),
  triggerButtonBarMock: vi.fn(),
    getNextProviderInstanceIdMock: (): number => {
      providerInstanceCounter += 1;
      return providerInstanceCounter;
    },
    resetProviderInstanceCounterMock: (): void => {
      providerInstanceCounter = 0;
    },
  };
});

vi.mock('@/features/products/context/ProductListContext', () => ({
  useProductListModalsContext: useProductListModalsContextMock,
}));

vi.mock('@/features/products/context/ProductFormContext', () => ({
  ProductFormProvider: ({ children }: { children: ReactNode }) => {
    const instanceIdRef = React.useRef<number | null>(null);
    if (instanceIdRef.current === null) {
      instanceIdRef.current = getNextProviderInstanceIdMock();
    }

    return (
      <div data-testid='product-form-provider' data-instance-id={String(instanceIdRef.current)}>
        {children}
      </div>
    );
  },
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductFormImageContext', () => ({
  useProductFormImages: () => ({
    showFileManager: false,
    handleMultiFileSelect: vi.fn(),
  }),
}));

vi.mock('@/shared/ui', () => ({
  FormModal: ({
    children,
    isSaveDisabled,
    saveText,
  }: {
    children: ReactNode;
    isSaveDisabled?: boolean;
    saveText?: string;
  }) => (
    <div data-testid='loading-form-modal'>
      <button type='button' disabled={Boolean(isSaveDisabled)}>
        {saveText ?? 'Save'}
      </button>
      {children}
    </div>
  ),
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid='skeleton' className={className} />
  ),
}));

vi.mock('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: (props: Record<string, unknown>) => {
    triggerButtonBarMock(props);
    return <div data-testid='trigger-button-bar' />;
  },
}));

vi.mock('@/features/products/components/ProductForm', () => ({
  default: () => <div data-testid='product-form' />,
}));

vi.mock('@/features/integrations', () => ({
  ListProductModal: () => null,
  MassListProductModal: () => null,
  ProductListingsModal: () => null,
  __esModule: true,
  default: () => null,
}));

import { ProductModals } from './ProductModals';

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

const createDraft = (overrides: Partial<ProductDraft> = {}): ProductDraft =>
  ({
    id: 'draft-1',
    name: 'Draft Template',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }) as ProductDraft;

const buildContext = (overrides: Record<string, unknown> = {}) => ({
  isCreateOpen: false,
  isPromptOpen: false,
  setIsPromptOpen: vi.fn(),
  handleConfirmSku: vi.fn(),
  initialSku: '',
  createDraft: null,
  initialCatalogId: null,
  onCloseCreate: vi.fn(),
  onCreateSuccess: vi.fn(),
  editingProduct: null,
  isEditHydrating: false,
  onCloseEdit: vi.fn(),
  onEditSuccess: vi.fn(),
  onEditSave: vi.fn(),
  integrationsProduct: null,
  onCloseIntegrations: vi.fn(),
  onStartListing: vi.fn(),
  showListProductModal: false,
  onCloseListProduct: vi.fn(),
  onListProductSuccess: vi.fn(),
  listProductPreset: null,
  exportSettingsProduct: null,
  onCloseExportSettings: vi.fn(),
  onListingsUpdated: vi.fn(),
  massListIntegration: null,
  massListProductIds: [],
  onCloseMassList: vi.fn(),
  onMassListSuccess: vi.fn(),
  showIntegrationModal: false,
  onCloseIntegrationModal: vi.fn(),
  onSelectIntegrationFromModal: vi.fn(),
  ...overrides,
});

describe('ProductModals edit hydration guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProviderInstanceCounterMock();
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: null,
      draft: null,
      getValues: vi.fn().mockReturnValue({}),
    });
  });

  it('renders a blocking loading modal while edit hydration is in progress', () => {
    useProductListModalsContextMock.mockReturnValue(buildContext({ isEditHydrating: true }));

    render(<ProductModals />);

    expect(screen.getByTestId('loading-form-modal')).toBeInTheDocument();
    expect(
      screen.getByText('Please wait while complete product data is loaded.')
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    // Form provider and its content must not be rendered during loading
    expect(screen.queryByTestId('product-form-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('product-form')).not.toBeInTheDocument();
  });

  it('disables save while hydration is in progress', () => {
    useProductListModalsContextMock.mockReturnValue(buildContext({ isEditHydrating: true }));

    render(<ProductModals />);

    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  it('does not render edit form for non-hydrated edit product snapshots', () => {
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        editingProduct: createProduct(),
      })
    );

    render(<ProductModals />);

    expect(screen.getByTestId('loading-form-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('product-form-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('product-form')).not.toBeInTheDocument();
  });

  it('renders edit form when the editing product is hydrated', () => {
    const hydrated = markEditingProductHydrated(createProduct());
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: hydrated,
      draft: null,
      getValues: vi.fn().mockReturnValue({ name: { en: 'Updated name' } }),
    });
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        editingProduct: hydrated,
      })
    );

    render(<ProductModals />);

    // The shared FormModal wrapper stays open
    expect(screen.getByTestId('loading-form-modal')).toBeInTheDocument();
    // ProductFormProvider renders inside the shared modal shell
    expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
    // Save button is enabled when form is loaded
    expect(screen.getByRole('button', { name: 'Update' })).not.toBeDisabled();
  });

  it('keeps the same edit provider instance after save refreshes updatedAt', () => {
    let editingProduct = markEditingProductHydrated(
      createProduct({ updatedAt: '2026-01-01T00:00:00.000Z' })
    );

    useProductFormCoreMock.mockImplementation(() => ({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: editingProduct,
      draft: null,
      getValues: vi.fn().mockReturnValue({ name: { en: 'Updated name' } }),
    }));
    useProductListModalsContextMock.mockImplementation(() =>
      buildContext({
        editingProduct,
      })
    );

    const { rerender } = render(<ProductModals />);

    const providerBefore = screen.getByTestId('product-form-provider');
    const instanceIdBefore = providerBefore.getAttribute('data-instance-id');

    editingProduct = markEditingProductHydrated(
      createProduct({
        updatedAt: '2026-01-03T00:00:00.000Z',
        name_en: 'Product 1 saved',
      })
    );

    rerender(<ProductModals />);

    const providerAfter = screen.getByTestId('product-form-provider');

    expect(providerAfter.getAttribute('data-instance-id')).toBe(instanceIdBefore);
    expect(providerAfter).toBe(providerBefore);
  });
});

describe('ProductModals create flows use unified modal shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProviderInstanceCounterMock();
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: null,
      draft: null,
      getValues: vi.fn().mockReturnValue({}),
    });
  });

  it('renders create product inside the shared FormModal + ProductFormProvider path', () => {
    useProductListModalsContextMock.mockReturnValue(buildContext({ isCreateOpen: true }));

    render(<ProductModals />);

    expect(screen.getByTestId('loading-form-modal')).toBeInTheDocument();
    expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('renders create-from-draft inside the same shared shell', () => {
    const draft = createDraft();
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: null,
      draft,
      getValues: vi.fn().mockReturnValue({ name: draft.name }),
    });
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        isCreateOpen: true,
        createDraft: draft,
      })
    );

    render(<ProductModals />);

    expect(screen.getByTestId('loading-form-modal')).toBeInTheDocument();
    expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});
