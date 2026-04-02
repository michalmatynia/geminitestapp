/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@/__tests__/test-utils';
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
  listProductModalPropsMock,
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
    listProductModalPropsMock: vi.fn(),
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
    validatorSessionKey?: string;
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

vi.mock('@/features/products/hooks/editingProductHydration', () => ({
  isEditingProductHydrated: vi.fn((p) => p?._isHydrated),
  markEditingProductHydrated: vi.fn((p) => ({ ...p, _isHydrated: true, description: 'full description' })),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  FormModal: (props: {
    children: ReactNode;
    isSaveDisabled?: boolean;
    saveText?: string;
    open?: boolean;
  }) => {
    const { children, isSaveDisabled, saveText, open } = props;
    if (!open) return null;
    return (
      <div data-testid='loading-form-modal'>
        <button type='button' disabled={Boolean(isSaveDisabled)}>
          {saveText ?? 'Save'}
        </button>
        {children}
      </div>
    );
  },
  Skeleton: () => <div data-testid='skeleton' />,
  IntegrationSelector: () => <div data-testid='integration-selector' />,
}));

vi.mock('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: (props: any) => {
    triggerButtonBarMock(props);
    return <div data-testid='trigger-button-bar' />;
  },
}));

vi.mock('@/features/integrations/public', () => ({
  ProductListingsModal: (props: any) => {
    productListingsModalPropsMock(props);
    return <div data-testid='product-listings-modal' />;
  },
  ListProductModal: (props: any) => {
    listProductModalPropsMock(props);
    return <div data-testid='list-product-modal' />;
  },
  MassListProductModal: (props: any) => <div data-testid='mass-list-product-modal' />,
}));

vi.mock('@/shared/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => ({
    data: [],
    isLoading: false,
  }),
  useDefaultExportConnection: () => ({
    data: null,
  }),
}));

import { ProductModals } from './ProductModals';

describe('ProductModals', () => {
  const createProduct = (): ProductWithImages => ({
    id: 'product-1',
    sku: 'SKU-1',
    name: 'Product 1',
    images: [],
    catalogIds: [],
    updatedAt: '2026-03-27T10:00:00Z',
  });

  const buildContext = (overrides: any = {}) => ({
    isCreateOpen: false,
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
    integrationsFilterIntegrationSlug: null,
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

  beforeEach(() => {
    vi.clearAllMocks();
    resetProviderInstanceCounterMock();
    useProductListHeaderActionsContextMock.mockReturnValue({
      showTriggerRunFeedback: false,
      setShowTriggerRunFeedback: vi.fn(),
    });
    useProductFormCoreMock.mockReturnValue({
      product: null,
      draft: null,
      getValues: () => ({}),
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
    });
  });

  describe('edit hydration guard', () => {
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
          integrationsFilterIntegrationSlug: 'tradera',
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
              filterIntegrationSlug: 'tradera',
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

    it('derives the listings modal marketplace filter from recovery context when the explicit filter is missing', async () => {
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          integrationsProduct: createProduct(),
          integrationsFilterIntegrationSlug: null,
          integrationsRecoveryContext: {
            source: 'tradera_quick_export_failed',
            integrationSlug: 'tradera',
            status: 'failed',
            runId: 'run-tradera-42',
          },
        })
      );

      render(<ProductModals />);

      await waitFor(() => {
        expect(productListingsModalPropsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'product-1' }),
            filterIntegrationSlug: 'tradera',
            recoveryContext: expect.objectContaining({
              source: 'tradera_quick_export_failed',
              integrationSlug: 'tradera',
              runId: 'run-tradera-42',
            }),
          })
        );
      });
    });

    it('routes export settings products through the Base-filtered listings modal', async () => {
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          exportSettingsProduct: createProduct(),
        })
      );

      render(<ProductModals />);

      await waitFor(() => {
        expect(productListingsModalPropsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'product-1' }),
            filterIntegrationSlug: 'baselinker',
          })
        );
      });
    });

    it('passes Tradera recovery auto-submit preset into the list product modal', async () => {
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          integrationsProduct: createProduct(),
          showListProductModal: true,
          listProductPreset: {
            integrationId: 'integration-tradera-1',
            connectionId: 'conn-tradera-1',
            autoSubmit: true,
          },
        })
      );

      render(<ProductModals />);

      await waitFor(() => {
        expect(listProductModalPropsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            item: expect.objectContaining({ id: 'product-1' }),
            initialIntegrationId: 'integration-tradera-1',
            initialConnectionId: 'conn-tradera-1',
            autoSubmitOnOpen: true,
          })
        );
      });
    });

    it('renders edit form when the editing product is hydrated', () => {
      const hydrated = markEditingProductHydrated(createProduct());
      useProductFormCoreMock.mockReturnValue({
        product: hydrated,
        draft: null,
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: hydrated,
        })
      );

      render(<ProductModals />);

      // The ProductForm component is dynamic, so it might show a skeleton initially
      // OR our mock of FormModal/ProductFormProvider might be rendering them.
      expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
    });
  });

  describe('trigger run feedback controls', () => {
    it('renders a show or hide statuses button next to modal trigger buttons', () => {
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: markEditingProductHydrated(createProduct()),
        })
      );

      render(<ProductModals />);

      expect(screen.getByText('Show Statuses')).toBeInTheDocument();
    });
  });

  describe('trigger entity normalization', () => {
    it('normalizes trigger entity catalogs from current form catalogIds', () => {
      const product = markEditingProductHydrated(createProduct());
      useProductFormCoreMock.mockReturnValue({
        product,
        draft: null,
        getValues: () => ({
          catalogIds: ['cat-1', 'cat-2'],
        }),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
        })
      );

      render(<ProductModals />);

      expect(triggerButtonBarMock).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'product_modal',
          entityType: 'product',
          entityId: 'product-1',
        })
      );

      const getEntityJson = triggerButtonBarMock.mock.calls[0][0].getEntityJson;
      const entityJson = getEntityJson();

      expect(entityJson).toMatchObject({
        id: 'product-1',
        catalogIds: ['cat-1', 'cat-2'],
      });
    });

    it('derives trigger entity publication status from the current product state', () => {
      const product = markEditingProductHydrated(createProduct());
      useProductFormCoreMock.mockReturnValue({
        product,
        draft: null,
        getValues: () => ({
          status: 'published',
        }),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
        })
      );

      render(<ProductModals />);

      const getEntityJson = triggerButtonBarMock.mock.calls[0][0].getEntityJson;
      const entityJson = getEntityJson();

      expect(entityJson).toMatchObject({
        status: 'published',
      });
    });
  });

  describe('provider stability', () => {
    it('keeps the same edit provider instance after save refreshes updatedAt', () => {
      const product = markEditingProductHydrated(createProduct());
      
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
        })
      );
      const { rerender } = render(<ProductModals />);

      const firstInstanceId = screen.getByTestId('product-form-provider').getAttribute('data-instance-id');

      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: { ...product, updatedAt: '2026-03-27T11:00:00Z' },
        })
      );
      rerender(<ProductModals />);

      const secondInstanceId = screen.getByTestId('product-form-provider').getAttribute('data-instance-id');
      expect(firstInstanceId).toBe(secondInstanceId);
    });

    it('keeps the same validator session while edit hydration upgrades a product snapshot', () => {
      const product = createProduct();
      
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
        })
      );
      const { rerender } = render(<ProductModals />);

      const firstSessionId = productFormProviderPropsMock.mock.calls[0][0].validatorSessionKey;

      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: markEditingProductHydrated(product),
        })
      );
      rerender(<ProductModals />);

      const secondSessionId = productFormProviderPropsMock.mock.calls[1][0].validatorSessionKey;
      expect(firstSessionId).toBe(secondSessionId);
    });

    it('starts a fresh validator session when reopening edit for the same product', () => {
      const product = createProduct();
      
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
        })
      );
      const { rerender } = render(<ProductModals />);

      const firstSessionId = productFormProviderPropsMock.mock.calls[0][0].validatorSessionKey;

      useProductListModalsContextMock.mockReturnValue(buildContext({ editingProduct: null }));
      rerender(<ProductModals />);

      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
        })
      );
      rerender(<ProductModals />);

      const secondSessionId = productFormProviderPropsMock.mock.calls[productFormProviderPropsMock.mock.calls.length - 1][0].validatorSessionKey;
      expect(firstSessionId).not.toBe(secondSessionId);
    });
  });

  describe('creation flows', () => {
    it('renders create product inside the shared FormModal + ProductFormProvider path', () => {
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );

      render(<ProductModals />);

      expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
      expect(productFormProviderPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
    });

    it('renders create-from-draft inside the same shared shell', () => {
      const draft = { id: 'draft-1', name: 'Draft 1' };
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: draft,
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );

      render(<ProductModals />);

      expect(screen.getByTestId('product-form-provider')).toBeInTheDocument();
      expect(productFormProviderPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          draft,
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
    });

    it('forwards the auto-increment placeholder SKU for draft-backed create flows', () => {
      const draft = { id: 'draft-1', name: 'Draft 1' };
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
});
