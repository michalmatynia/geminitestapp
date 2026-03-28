import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { type ReactNode } from 'react';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductDraft, ProductWithImages } from '@/shared/contracts/products';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';

const { useProductListHeaderActionsContextMock, useProductListModalsContextMock } = vi.hoisted(() => ({
  useProductListHeaderActionsContextMock: vi.fn(),
  useProductListModalsContextMock: vi.fn(),
}));

const {
  productFormPropsMock,
  useProductFormCoreMock,
  productFormProviderPropsMock,
  triggerButtonBarMock,
  productListingsModalPropsMock,
  getNextProviderInstanceIdMock,
  resetProviderInstanceCounterMock,
} = vi.hoisted(() => {
  let providerInstanceCounter = 0;

  return {
    productFormPropsMock: vi.fn(),
    useProductFormCoreMock: vi.fn(),
    productFormProviderPropsMock: vi.fn(),
    triggerButtonBarMock: vi.fn(),
    productListingsModalPropsMock: vi.fn(),
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
  useProductListHeaderActionsContext: useProductListHeaderActionsContextMock,
  useProductListModalsContext: useProductListModalsContextMock,
}));

vi.mock('@/features/products/context/ProductFormContext', () => ({
  ProductFormProvider: ({
    children,
    ...props
  }: {
    children: ReactNode;
    initialSku?: string;
    draft?: ProductDraft;
    product?: ProductWithImages;
  }) => {
    productFormProviderPropsMock(props);
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
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
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
  default: (props: Record<string, unknown>) => {
    productFormPropsMock(props);
    return <div data-testid='product-form' />;
  },
}));

vi.mock('@/features/integrations/product-integrations-adapter', () => ({
  ListProductModal: () => null,
  MassListProductModal: () => null,
  ProductListingsModal: (props: Record<string, unknown>) => {
    productListingsModalPropsMock(props);
    return null;
  },
}));

import { ProductModals, buildTriggeredProductEntityJson } from './ProductModals';

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
  integrationsRecoveryContext: null,
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
    useProductListHeaderActionsContextMock.mockReturnValue({
      showTriggerRunFeedback: true,
      setShowTriggerRunFeedback: vi.fn(),
    });
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: null,
      draft: null,
      getValues: vi.fn().mockReturnValue({}),
    });
  });

  it('renders the edit modal shell while hydration is in progress', () => {
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        editingProduct: createProduct(),
        isEditHydrating: true,
      })
    );

    render(<ProductModals />);

    expect(screen.getByTestId('loading-form-modal')).toBeInTheDocument();
    expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
    expect(
      screen.getByText('Please wait while complete product data is loaded.')
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('disables save while hydration is in progress', () => {
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        editingProduct: createProduct(),
        isEditHydrating: true,
      })
    );

    render(<ProductModals />);

    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
  });

  it('renders edit form for non-hydrated edit product snapshots while keeping save enabled state external', () => {
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        editingProduct: createProduct(),
      })
    );

    render(<ProductModals />);

    expect(screen.getByTestId('loading-form-modal')).toBeInTheDocument();
    expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).not.toBeDisabled();
  });

  it('passes failed export recovery context into the listings modal', async () => {
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        integrationsProduct: createProduct(),
        integrationsRecoveryContext: {
          source: 'base_quick_export_failed',
          integrationSlug: 'baselinker',
          status: 'failed',
          runId: 'run-failed-42',
        },
      })
    );

    render(<ProductModals />);

    await waitFor(() => {
      expect(productListingsModalPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({ id: 'product-1' }),
          recoveryContext: {
            source: 'base_quick_export_failed',
            integrationSlug: 'baselinker',
            status: 'failed',
            runId: 'run-failed-42',
          },
        })
      );
    });
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

  it('renders a show or hide statuses button next to modal trigger buttons', () => {
    const hydrated = markEditingProductHydrated(createProduct());
    const setShowTriggerRunFeedback = vi.fn();
    useProductListHeaderActionsContextMock.mockReturnValue({
      showTriggerRunFeedback: true,
      setShowTriggerRunFeedback,
    });
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: hydrated,
      draft: null,
      getValues: vi.fn().mockReturnValue({}),
    });
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        editingProduct: hydrated,
      })
    );

    render(<ProductModals />);

    expect(screen.getByRole('button', { name: 'Hide trigger run pills' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide trigger run pills' }));

    expect(setShowTriggerRunFeedback).toHaveBeenCalledWith(false);
    expect(screen.getByText('Hide Statuses')).toBeInTheDocument();
  });

  it('normalizes trigger entity catalogs from current form catalogIds', () => {
    const hydrated = markEditingProductHydrated(
      createProduct({
        catalogId: 'catalog-base',
        catalogs: [{ productId: 'product-1', catalogId: 'catalog-base', assignedAt: '2026-01-01' }],
      })
    );

    const entityJson = buildTriggeredProductEntityJson({
      product: hydrated,
      draft: null,
      values: {
        catalogIds: ['catalog-form'],
      },
    });

    expect(entityJson['catalogId']).toBe('catalog-form');
    expect(entityJson['catalogs']).toEqual([
      expect.objectContaining({
        catalogId: 'catalog-form',
        productId: 'product-1',
      }),
    ]);
  });

  it('derives trigger entity publication status from the current product state', () => {
    const entityJson = buildTriggeredProductEntityJson({
      product: createProduct({ published: false }),
      draft: null,
      values: {},
    });

    expect(entityJson).toEqual(
      expect.objectContaining({
        id: 'product-1',
        published: false,
        status: 'draft',
        publicationStatus: 'draft',
      })
    );
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

  it('keeps the same validator session while edit hydration upgrades a product snapshot', () => {
    let editingProduct = createProduct({
      id: 'product-hydration-session',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    useProductFormCoreMock.mockImplementation(() => ({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: editingProduct,
      draft: null,
      getValues: vi.fn().mockReturnValue({}),
    }));
    useProductListModalsContextMock.mockImplementation(() =>
      buildContext({
        editingProduct,
      })
    );

    const { rerender } = render(<ProductModals />);

    const sessionKeyBefore = productFormPropsMock.mock.lastCall?.[0]?.[
      'validatorSessionKey'
    ] as string | undefined;

    editingProduct = markEditingProductHydrated(
      createProduct({
        id: 'product-hydration-session',
        updatedAt: '2026-01-02T00:00:00.000Z',
        name_en: 'Hydrated product',
      })
    );

    rerender(<ProductModals />);

    const sessionKeyAfter = productFormPropsMock.mock.lastCall?.[0]?.[
      'validatorSessionKey'
    ] as string | undefined;

    expect(sessionKeyBefore).toBeTruthy();
    expect(sessionKeyAfter).toBeTruthy();
    expect(sessionKeyAfter).toBe(sessionKeyBefore);
  });

  it('starts a fresh validator session when reopening edit for the same product', () => {
    const editingProduct = markEditingProductHydrated(createProduct());

    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: editingProduct,
      draft: null,
      getValues: vi.fn().mockReturnValue({}),
    });

    const openContext = buildContext({ editingProduct });
    const closedContext = buildContext({ editingProduct: null });
    useProductListModalsContextMock.mockReturnValue(openContext);

    const { rerender } = render(<ProductModals />);

    const firstSessionKey = productFormPropsMock.mock.lastCall?.[0]?.[
      'validatorSessionKey'
    ] as string | undefined;

    useProductListModalsContextMock.mockReturnValue(closedContext);
    rerender(<ProductModals />);

    useProductListModalsContextMock.mockReturnValue(openContext);
    rerender(<ProductModals />);

    const reopenedSessionKey = productFormPropsMock.mock.lastCall?.[0]?.[
      'validatorSessionKey'
    ] as string | undefined;

    expect(firstSessionKey).toBeTruthy();
    expect(reopenedSessionKey).toBeTruthy();
    expect(reopenedSessionKey).not.toBe(firstSessionKey);
    expect(productFormPropsMock.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        validationInstanceScopeOverride: 'product_edit',
      })
    );
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

  it('forwards the auto-increment placeholder SKU for draft-backed create flows', () => {
    const draft = createDraft({ sku: 'DRAFT-OLD-099' } as Partial<ProductDraft>);
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      product: null,
      draft,
      getValues: vi.fn().mockReturnValue({}),
    });
    useProductListModalsContextMock.mockReturnValue(
      buildContext({
        isCreateOpen: true,
        createDraft: draft,
        initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
      })
    );

    render(<ProductModals />);

    expect(productFormProviderPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draft,
        initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
      })
    );
  });
});
