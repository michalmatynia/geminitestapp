/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { type ReactNode } from 'react';
import { act } from 'react';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';

const {
  useProductListHeaderActionsContextMock,
  useProductListModalsContextMock,
  useProductListSelectionContextMock,
  useProductFormImagesMock,
} = vi.hoisted(() => ({
  useProductListHeaderActionsContextMock: vi.fn(),
  useProductListModalsContextMock: vi.fn(),
  useProductListSelectionContextMock: vi.fn(),
  useProductFormImagesMock: vi.fn(),
}));

const {
  useProductFormCoreMock,
  useProductFormMetadataMock,
  productFormProviderPropsMock,
  triggerButtonBarMock,
  listProductModalPropsMock,
  productListingsModalPropsMock,
  getNextProviderInstanceIdMock,
  resetProviderInstanceCounterMock,
  subscribeToTrackedAiPathRunMock,
  getAiPathRunResultMock,
} = vi.hoisted(() => {
  let providerInstanceCounter = 0;

  return {
    useProductFormCoreMock: vi.fn(),
    useProductFormMetadataMock: vi.fn(),
    productFormProviderPropsMock: vi.fn(),
    triggerButtonBarMock: vi.fn(),
    listProductModalPropsMock: vi.fn(),
    productListingsModalPropsMock: vi.fn(),
    subscribeToTrackedAiPathRunMock: vi.fn(),
    getAiPathRunResultMock: vi.fn(),
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
  useProductListSelectionContext: useProductListSelectionContextMock,
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

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
  useProductFormMetadataState: () => useProductFormMetadataMock(),
}));

vi.mock('@/features/products/context/ProductFormImageContext', () => ({
  useProductFormImages: () => useProductFormImagesMock(),
}));

vi.mock('@/features/products/context-registry/ProductLeafCategoriesContextRegistrySource', () => ({
  ProductLeafCategoriesContextRegistrySource: () => null,
}));

vi.mock('./product-form-preload', () => ({
  loadProductForm: async () => ({
    default: () => <div data-testid='product-form' />,
  }),
  preloadProductFormChunk: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/client-run-tracker', () => ({
  subscribeToTrackedAiPathRun: (...args: unknown[]) => subscribeToTrackedAiPathRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRunResult: (...args: unknown[]) => getAiPathRunResultMock(...args),
}));

vi.mock('@/features/products/hooks/editingProductHydration', () => ({
  isEditingProductHydrated: vi.fn((p) => p?._isHydrated),
  markEditingProductHydrated: vi.fn((p) => ({ ...p, _isHydrated: true, description: 'full description' })),
}));

vi.mock('@/shared/ui/button', () => ({
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
}));

vi.mock('@/shared/ui/FormModal', () => ({
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
}));

vi.mock('@/shared/ui/skeleton', () => ({
  Skeleton: () => <div data-testid='skeleton' />,
}));

vi.mock('@/shared/ui/integration-selector', () => ({
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
  MassListProductModal: () => <div data-testid='mass-list-product-modal' />,
}));

vi.mock('@/features/integrations/components/listings/ProductListingsModal', () => ({
  ProductListingsModal: (props: any) => {
    productListingsModalPropsMock(props);
    return <div data-testid='product-listings-modal' />;
  },
}));

vi.mock('@/features/integrations/components/listings/ListProductModal', () => ({
  default: (props: any) => {
    listProductModalPropsMock(props);
    return <div data-testid='list-product-modal' />;
  },
}));

vi.mock('@/features/integrations/components/listings/MassListProductModal', () => ({
  default: () => <div data-testid='mass-list-product-modal' />,
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
    subscribeToTrackedAiPathRunMock.mockReturnValue(() => {});
    getAiPathRunResultMock.mockResolvedValue({
      ok: true,
      data: {
        nodes: [],
      },
    });
    useProductListHeaderActionsContextMock.mockReturnValue({
      showTriggerRunFeedback: false,
      setShowTriggerRunFeedback: vi.fn(),
    });
    useProductListSelectionContextMock.mockReturnValue({
      data: [],
    });
    useProductFormCoreMock.mockReturnValue({
      product: null,
      draft: null,
      getValues: () => ({}),
      handleSubmit: vi.fn(),
      uploading: false,
      hasUnsavedChanges: false,
      setValue: vi.fn(),
      setNormalizeNameError: vi.fn(),
    });
    useProductFormImagesMock.mockReturnValue({
      showFileManager: false,
      handleMultiFileSelect: vi.fn(),
      imageLinks: [],
      imageBase64s: [],
      imageSlots: [],
    });
    useProductFormMetadataMock.mockReturnValue({
      categories: [
        {
          id: 'parent-pins',
          name: 'Pins',
          color: null,
          parentId: null,
          catalogId: 'catalog-a',
        },
        {
          id: 'leaf-anime-pins',
          name: 'Anime Pins',
          color: null,
          parentId: 'parent-pins',
          catalogId: 'catalog-a',
        },
      ],
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

    it('disables product-modal AI trigger buttons while edit hydration is in progress', async () => {
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: createProduct(),
          isEditHydrating: true,
        })
      );

      render(<ProductModals />);

      await waitFor(() => {
        expect(triggerButtonBarMock).toHaveBeenCalledWith(
          expect.objectContaining({
            location: 'product_modal',
            disabled: true,
          })
        );
      });
      expect(
        screen.getByText('AI actions are unavailable until full product details finish loading.')
      ).toBeInTheDocument();
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

    it('suppresses the non-hydrated edit warning while edit hydration is in progress', () => {
      const product = createProduct();
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
          isEditHydrating: true,
        })
      );

      render(<ProductModals />);

      const lastProviderProps =
        productFormProviderPropsMock.mock.calls[
          productFormProviderPropsMock.mock.calls.length - 1
        ]?.[0];

      expect(lastProviderProps).toEqual(
        expect.objectContaining({
          product,
          requireHydratedEditProduct: true,
          suppressNonHydratedEditWarning: true,
        })
      );
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

  describe('local normalize completion bridge', () => {
    it('applies the completed normalize result into create-mode name_en', async () => {
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();

      useProductFormCoreMock.mockReturnValue({
        product: {
          id: 'transient-product-1',
        },
        draft: { id: 'draft-1', name: 'Draft 1' },
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { id: 'draft-1', name: 'Draft 1' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      getAiPathRunResultMock.mockResolvedValue({
        ok: true,
        data: {
          nodes: [
            {
              nodeType: 'mapper',
              outputs: {
                bundle: {
                  normalizedName: 'Normalized Name | 4 cm | Metal | Anime Pins | Anime',
                  isValid: true,
                },
              },
            },
          ],
        },
      });

      render(<ProductModals />);

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-1',
          entityId: 'transient-product-1',
          entityType: 'product',
        });
      });

      await waitFor(() => {
        expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
          'run-normalize-1',
          expect.any(Function)
        );
      });
      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-1',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'transient-product-1',
          entityType: 'product',
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(getAiPathRunResultMock).toHaveBeenCalledWith('run-normalize-1', {
          timeoutMs: 60_000,
        });
      });
      expect(setValue).toHaveBeenCalledWith(
        'name_en',
        'Normalized Name | 4 cm | Metal | Anime Pins | Anime',
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        }
      );
      expect(setNormalizeNameError).toHaveBeenCalledWith(null);
    });

    it('applies streamed normalize results into create-mode name_en without fetching the run result endpoint', async () => {
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();

      useProductFormCoreMock.mockReturnValue({
        product: {
          id: 'transient-product-2',
        },
        draft: { id: 'draft-2', name: 'Draft 2' },
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { id: 'draft-2', name: 'Draft 2' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );

      render(<ProductModals />);

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-2',
          entityId: 'transient-product-2',
          entityType: 'product',
        });
      });

      await waitFor(() => {
        expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
          'run-normalize-2',
          expect.any(Function)
        );
      });
      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-2',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'transient-product-2',
          entityType: 'product',
          run: {
            id: 'run-normalize-2',
            status: 'completed',
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:05.000Z',
            startedAt: null,
            finishedAt: '2026-04-09T00:00:05.000Z',
            errorMessage: null,
            pathId: 'path_name_normalize_v1',
            pathName: 'Normalize',
            triggerEvent: 'button-normalize',
            triggerNodeId: 'node-trigger',
            entityId: 'transient-product-2',
            entityType: 'product',
            requestId: null,
            meta: null,
            graph: null,
            triggerContext: null,
            runtimeState: {
              outputs: {
                'node-mapper': {
                  bundle: {
                    normalizedName: 'Streamed Name | 4 cm | Metal | Anime Pins | Anime',
                    isValid: true,
                  },
                },
              },
            },
          },
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(setValue).toHaveBeenCalledWith(
          'name_en',
          'Streamed Name | 4 cm | Metal | Anime Pins | Anime',
          {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          }
        );
      });
      expect(getAiPathRunResultMock).not.toHaveBeenCalled();
      expect(setNormalizeNameError).toHaveBeenCalledWith(null);
    });

    it('applies the completed normalize result into edit-mode name_en', async () => {
      const product = markEditingProductHydrated(createProduct());
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();

      useProductFormCoreMock.mockReturnValue({
        product,
        draft: null,
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: product,
        })
      );
      getAiPathRunResultMock.mockResolvedValue({
        ok: true,
        data: {
          nodes: [
            {
              nodeType: 'mapper',
              outputs: {
                bundle: {
                  normalizedName: 'Updated Name | 5 cm | Metal | Anime Pins | Manga',
                  isValid: true,
                },
              },
            },
          ],
        },
      });

      render(<ProductModals />);

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-1',
          entityId: 'product-1',
          entityType: 'product',
        });
      });

      await waitFor(() => {
        expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
          'run-normalize-1',
          expect.any(Function)
        );
      });

      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-1',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'product-1',
          entityType: 'product',
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(setValue).toHaveBeenCalledWith(
          'name_en',
          'Updated Name | 5 cm | Metal | Anime Pins | Manga',
          {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          }
        );
      });
      expect(setNormalizeNameError).toHaveBeenCalledWith(null);
    });

    it('canonicalizes a returned category hierarchy down to the final leaf before applying name_en', async () => {
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();

      useProductFormCoreMock.mockReturnValue({
        product: {
          id: 'transient-product-1',
        },
        draft: { id: 'draft-1', name: 'Draft 1' },
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { id: 'draft-1', name: 'Draft 1' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      getAiPathRunResultMock.mockResolvedValue({
        ok: true,
        data: {
          nodes: [
            {
              nodeType: 'mapper',
              outputs: {
                bundle: {
                  normalizedName: 'Normalized Name | 4 cm | Metal | Pins > Anime Pins | Anime',
                  isValid: true,
                },
              },
            },
          ],
        },
      });

      render(<ProductModals />);

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-leaf-canonicalization',
          entityId: 'transient-product-1',
          entityType: 'product',
        });
      });

      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-leaf-canonicalization',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'transient-product-1',
          entityType: 'product',
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(setValue).toHaveBeenCalledWith(
          'name_en',
          'Normalized Name | 4 cm | Metal | Anime Pins | Anime',
          {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          }
        );
      });
      expect(setNormalizeNameError).toHaveBeenCalledWith(null);
    });

    it('prefers a more specific category hierarchy hint when the normalized title still uses a generic parent segment', async () => {
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();

      useProductFormCoreMock.mockReturnValue({
        product: {
          id: 'transient-product-1',
        },
        draft: { id: 'draft-1', name: 'Draft 1' },
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      });
      useProductFormMetadataMock.mockReturnValue({
        categories: [
          {
            id: 'parent-accessories',
            name: 'Accessories',
            color: null,
            parentId: null,
            catalogId: 'catalog-a',
          },
          {
            id: 'parent-keychains',
            name: 'Keychains',
            color: null,
            parentId: 'parent-accessories',
            catalogId: 'catalog-a',
          },
          {
            id: 'leaf-movie-keychain',
            name: 'Movie Keychain',
            color: null,
            parentId: 'parent-keychains',
            catalogId: 'catalog-a',
          },
          {
            id: 'leaf-gaming-keychain',
            name: 'Gaming Keychain',
            color: null,
            parentId: 'parent-keychains',
            catalogId: 'catalog-a',
          },
        ],
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { id: 'draft-1', name: 'Draft 1' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      getAiPathRunResultMock.mockResolvedValue({
        ok: true,
        data: {
          nodes: [
            {
              nodeType: 'mapper',
              outputs: {
                bundle: {
                  normalizedName: 'Normalized Name | 4 cm | Metal | Keychains | Gaming',
                  category: 'Accessories > Keychains > Gaming Keychain',
                  isValid: true,
                },
              },
            },
          ],
        },
      });

      render(<ProductModals />);

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-specific-keychain-leaf',
          entityId: 'transient-product-1',
          entityType: 'product',
        });
      });

      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-specific-keychain-leaf',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'transient-product-1',
          entityType: 'product',
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(setValue).toHaveBeenCalledWith(
          'name_en',
          'Normalized Name | 4 cm | Metal | Gaming Keychain | Gaming',
          {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          }
        );
      });
      expect(setNormalizeNameError).toHaveBeenCalledWith(null);
    });

    it('uses AI Path live category context when local category metadata is stale or empty', async () => {
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();

      useProductFormCoreMock.mockReturnValue({
        product: {
          id: 'transient-product-1',
        },
        draft: { id: 'draft-1', name: 'Draft 1' },
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      });
      useProductFormMetadataMock.mockReturnValue({
        categories: [],
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { id: 'draft-1', name: 'Draft 1' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      getAiPathRunResultMock.mockResolvedValue({
        ok: true,
        data: {
          nodes: [
            {
              nodeType: 'function',
              outputs: {
                bundle: {
                  categoryContext: {
                    catalogId: 'catalog-a',
                    totalCategories: 4,
                    totalLeafCategories: 2,
                    allowedLeafLabels: ['Movie Keychain', 'Gaming Keychain'],
                    leafCategories: [
                      {
                        id: 'leaf-movie-keychain',
                        label: 'Movie Keychain',
                        fullPath: 'Accessories > Keychains > Movie Keychain',
                        parentId: 'parent-keychains',
                        isCurrent: false,
                      },
                      {
                        id: 'leaf-gaming-keychain',
                        label: 'Gaming Keychain',
                        fullPath: 'Accessories > Keychains > Gaming Keychain',
                        parentId: 'parent-keychains',
                        isCurrent: true,
                      },
                    ],
                  },
                },
              },
            },
            {
              nodeType: 'mapper',
              outputs: {
                bundle: {
                  normalizedName: 'Normalized Name | 4 cm | Metal | Keychains | Gaming',
                  category: 'Accessories > Keychains > Gaming Keychain',
                  isValid: true,
                },
              },
            },
          ],
        },
      });

      render(<ProductModals />);

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-live-category-context',
          entityId: 'transient-product-1',
          entityType: 'product',
        });
      });

      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-live-category-context',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'transient-product-1',
          entityType: 'product',
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(setValue).toHaveBeenCalledWith(
          'name_en',
          'Normalized Name | 4 cm | Metal | Gaming Keychain | Gaming',
          {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          }
        );
      });
      expect(setNormalizeNameError).toHaveBeenCalledWith(null);
    });

    it('keeps pending normalize runs alive across edit hydration remounts', async () => {
      const partialProduct = createProduct();
      const hydratedProduct = markEditingProductHydrated(createProduct());
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();
      let currentProduct = partialProduct;

      useProductFormCoreMock.mockImplementation(() => ({
        product: currentProduct,
        draft: null,
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      }));
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: partialProduct,
          isEditHydrating: true,
        })
      );
      getAiPathRunResultMock.mockResolvedValue({
        ok: true,
        data: {
          nodes: [
            {
              nodeType: 'mapper',
              outputs: {
                bundle: {
                  normalizedName: 'Updated Name | 5 cm | Metal | Anime Pins | Manga',
                  isValid: true,
                },
              },
            },
          ],
        },
      });

      const view = render(<ProductModals />);
      const firstProviderInstanceId = screen
        .getByTestId('product-form-provider')
        .getAttribute('data-instance-id');

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-remount-survival',
          entityId: 'product-1',
          entityType: 'product',
        });
      });

      await waitFor(() => {
        expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
          'run-normalize-remount-survival',
          expect.any(Function)
        );
      });

      currentProduct = hydratedProduct;
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          editingProduct: hydratedProduct,
          isEditHydrating: false,
        })
      );
      view.rerender(<ProductModals />);

      const secondProviderInstanceId = screen
        .getByTestId('product-form-provider')
        .getAttribute('data-instance-id');
      expect(secondProviderInstanceId).not.toBe(firstProviderInstanceId);

      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-remount-survival',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'product-1',
          entityType: 'product',
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(setValue).toHaveBeenCalledWith(
          'name_en',
          'Updated Name | 5 cm | Metal | Anime Pins | Manga',
          {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          }
        );
      });
      expect(setNormalizeNameError).toHaveBeenCalledWith(null);
    });

    it('reports an inline normalize error when the AI result is still placeholder shaped', async () => {
      const setValue = vi.fn();
      const setNormalizeNameError = vi.fn();

      useProductFormCoreMock.mockReturnValue({
        product: {
          id: 'transient-product-1',
        },
        draft: { id: 'draft-1', name: 'Draft 1' },
        getValues: () => ({}),
        handleSubmit: vi.fn(),
        uploading: false,
        hasUnsavedChanges: false,
        setValue,
        setNormalizeNameError,
      });
      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { id: 'draft-1', name: 'Draft 1' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      getAiPathRunResultMock.mockResolvedValue({
        ok: true,
        data: {
          nodes: [
            {
              nodeType: 'mapper',
              outputs: {
                bundle: {
                  normalizedName: 'Name | X cm | Metal | Pins | Lore',
                  isValid: true,
                },
              },
            },
          ],
        },
      });

      render(<ProductModals />);

      const onRunQueued = triggerButtonBarMock.mock.calls[0][0].onRunQueued;
      await act(async () => {
        onRunQueued({
          button: {
            id: 'button-normalize',
            name: 'Normalize',
            iconId: null,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: { label: 'Normalize' },
            pathId: 'path_name_normalize_v1',
            enabled: true,
            sortIndex: 0,
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z',
          },
          runId: 'run-normalize-invalid',
          entityId: 'transient-product-1',
          entityType: 'product',
        });
      });

      const listener = subscribeToTrackedAiPathRunMock.mock.calls[0]?.[1];
      expect(typeof listener).toBe('function');

      await act(async () => {
        await listener({
          runId: 'run-normalize-invalid',
          status: 'completed',
          updatedAt: '2026-04-09T00:00:05.000Z',
          finishedAt: '2026-04-09T00:00:05.000Z',
          errorMessage: null,
          entityId: 'transient-product-1',
          entityType: 'product',
          trackingState: 'stopped',
        });
      });

      await waitFor(() => {
        expect(setNormalizeNameError).toHaveBeenCalledWith(
          'Normalize failed: the title segment is still generic. Provide a specific product title.'
        );
      });
      expect(setValue).not.toHaveBeenCalled();
    });
  });

  describe('trigger entity normalization', () => {
    it('includes current form image links in the trigger payload', () => {
      useProductFormImagesMock.mockReturnValue({
        showFileManager: false,
        handleMultiFileSelect: vi.fn(),
        imageLinks: ['https://from-form.com', '   ', 'https://from-form-2.com'],
        imageBase64s: [],
        imageSlots: [],
      });

      const product = markEditingProductHydrated(createProduct());
      useProductFormCoreMock.mockReturnValue({
        product,
        draft: null,
        getValues: () => ({}),
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

      return waitFor(() => {
        const getEntityJson = triggerButtonBarMock.mock.calls[0][0].getEntityJson;
        const entityJson = getEntityJson();

        expect(entityJson).toMatchObject({
          imageLinks: ['https://from-form.com', 'https://from-form-2.com'],
        });
      });
    });

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

      return waitFor(() => {
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
          catalogId: 'cat-1',
          catalogs: [{ catalogId: 'cat-1' }, { catalogId: 'cat-2' }],
        });
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

      return waitFor(() => {
        const getEntityJson = triggerButtonBarMock.mock.calls[0][0].getEntityJson;
        const entityJson = getEntityJson();

        expect(entityJson).toMatchObject({
          status: 'published',
        });
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

    it('keeps the same create-from-draft provider instance after the draft refreshes updatedAt', () => {
      const draft = { id: 'draft-1', name: 'Draft 1', updatedAt: '2026-03-27T10:00:00Z' };

      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: draft,
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      const { rerender } = render(<ProductModals />);

      const firstInstanceId = screen
        .getByTestId('product-form-provider')
        .getAttribute('data-instance-id');

      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { ...draft, updatedAt: '2026-03-27T11:00:00Z' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      rerender(<ProductModals />);

      const secondInstanceId = screen
        .getByTestId('product-form-provider')
        .getAttribute('data-instance-id');
      expect(firstInstanceId).toBe(secondInstanceId);
    });

    it('keeps the same validator session while the create-from-draft source refreshes updatedAt', () => {
      const draft = { id: 'draft-1', name: 'Draft 1', updatedAt: '2026-03-27T10:00:00Z' };

      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: draft,
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
        })
      );
      const { rerender } = render(<ProductModals />);

      const firstSessionId = productFormProviderPropsMock.mock.calls[0][0].validatorSessionKey;

      useProductListModalsContextMock.mockReturnValue(
        buildContext({
          isCreateOpen: true,
          createDraft: { ...draft, updatedAt: '2026-03-27T11:00:00Z' },
          initialSku: PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER,
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
