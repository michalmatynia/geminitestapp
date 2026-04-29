'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

import {
  useIntegrationModalOperations,
  resolveProductListingsIntegrationScope,
} from '@/features/integrations/product-integrations-adapter';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { enrichRecoveryContext, shouldRefreshListingsForScope } from './useProductListModals.recovery';

export type ProductListModalsContextValue = {
  createDraft: ProductDraft | null;
  setCreateDraft: (draft: ProductDraft | null) => void;
  handleOpenCreate: () => void;
  handleOpenIntegrationsModal: (
    product: ProductWithImages,
    recoveryContext?: ProductListingsRecoveryContext,
    filterIntegrationSlug?: string | null
  ) => void;
  handleOpenExportSettings: (product: ProductWithImages) => void;
  handleCloseIntegrations: () => void;
  handleCloseListProduct: () => void;
  handleListProductSuccess: () => void;
  handleStartListing: (
    integrationId: string,
    connectionId: string,
    options?: { autoSubmit?: boolean }
  ) => void;
  massListIntegration: {
    integrationId: string;
    connectionId: string;
  } | null;
  massListProductIds: string[];
  isMassListing: boolean;
  showIntegrationModal: boolean;
  handleCloseIntegrationModal: () => void;
  handleSelectIntegrationFromModal: (integrationId: string, connectionId: string) => void;
  handleCloseMassList: () => void;
  handleMassListSuccess: () => void;
  handleAddToMarketplace: () => void;
  integrationsProduct: ProductWithImages | null;
  integrationsRecoveryContext: ProductListingsRecoveryContext | null;
  integrationsFilterIntegrationSlug: string | null;
  showListProductModal: boolean;
  listProductPreset: {
    integrationId: string;
    connectionId: string;
    autoSubmit?: boolean;
  } | null;
  exportSettingsProduct: ProductWithImages | null;
  setExportSettingsProduct: (product: ProductWithImages | null) => void;
  refreshListingBadges: () => Promise<void>;
};

type IntegrationControls = Pick<
  ProductListModalsContextValue,
  | 'exportSettingsProduct'
  | 'handleCloseIntegrations'
  | 'handleCloseListProduct'
  | 'handleListProductSuccess'
  | 'handleOpenExportSettings'
  | 'handleOpenIntegrationsModal'
  | 'handleStartListing'
  | 'integrationsFilterIntegrationSlug'
  | 'integrationsProduct'
  | 'integrationsRecoveryContext'
  | 'listProductPreset'
  | 'refreshListingBadges'
  | 'setExportSettingsProduct'
  | 'showListProductModal'
>;

type OpenIntegrationsHandlerArgs = {
  prefetchIntegrationSelectionData: () => void;
  prefetchProductListingsData: (productId: string) => void;
  refreshProductListingsData: (productId: string) => void;
  setIntegrationsFilterIntegrationSlug: Dispatch<SetStateAction<string | null>>;
  setIntegrationsProduct: (product: ProductWithImages | null) => void;
  setIntegrationsRecoveryContext: Dispatch<SetStateAction<ProductListingsRecoveryContext | null>>;
};

type IntegrationModalOperations = ReturnType<typeof useIntegrationModalOperations>;

export function useCreateDraftControls(
  handleOpenCreateModal: () => void
): Pick<ProductListModalsContextValue, 'createDraft' | 'handleOpenCreate' | 'setCreateDraft'> {
  const [createDraft, setCreateDraft] = useState<ProductDraft | null>(null);
  const handleOpenCreate = useCallback((): void => {
    setCreateDraft(null);
    handleOpenCreateModal();
  }, [handleOpenCreateModal]);

  return { createDraft, setCreateDraft, handleOpenCreate };
}

function useOpenIntegrationsModalHandler({
  prefetchIntegrationSelectionData,
  prefetchProductListingsData,
  refreshProductListingsData,
  setIntegrationsFilterIntegrationSlug,
  setIntegrationsProduct,
  setIntegrationsRecoveryContext,
}: OpenIntegrationsHandlerArgs): ProductListModalsContextValue['handleOpenIntegrationsModal'] {
  return useCallback(
    (product, recoveryContext, filterIntegrationSlug): void => {
      const resolvedFilterIntegrationSlug = resolveProductListingsIntegrationScope({
        filterIntegrationSlug,
        recoveryContext,
      });
      prefetchIntegrationSelectionData();
      prefetchProductListingsData(product.id);
      if (shouldRefreshListingsForScope(resolvedFilterIntegrationSlug, recoveryContext)) {
        refreshProductListingsData(product.id);
      }
      setIntegrationsRecoveryContext(enrichRecoveryContext(product.id, recoveryContext));
      setIntegrationsFilterIntegrationSlug(resolvedFilterIntegrationSlug);
      setIntegrationsProduct(product);
    },
    [
      prefetchIntegrationSelectionData,
      prefetchProductListingsData,
      refreshProductListingsData,
      setIntegrationsFilterIntegrationSlug,
      setIntegrationsProduct,
      setIntegrationsRecoveryContext,
    ]
  );
}

function useIntegrationLifecycleHandlers({
  integrationsProduct,
  refreshProductListingsData,
  setIntegrationsFilterIntegrationSlug,
  setIntegrationsProduct,
  setIntegrationsRecoveryContext,
  setListProductPreset,
  setShowListProductModal,
  baseHandleListProductSuccess,
}: Pick<
  IntegrationModalOperations,
  | 'handleListProductSuccess'
  | 'integrationsProduct'
  | 'setIntegrationsProduct'
  | 'setListProductPreset'
  | 'setShowListProductModal'
> & {
  refreshProductListingsData: (productId: string) => void;
  setIntegrationsFilterIntegrationSlug: Dispatch<SetStateAction<string | null>>;
  setIntegrationsRecoveryContext: Dispatch<SetStateAction<ProductListingsRecoveryContext | null>>;
  baseHandleListProductSuccess: () => void;
}): Pick<ProductListModalsContextValue, 'handleCloseIntegrations' | 'handleCloseListProduct' | 'handleListProductSuccess'> {
  const handleCloseIntegrations = useCallback((): void => {
    setIntegrationsProduct(null);
    setIntegrationsRecoveryContext(null);
    setIntegrationsFilterIntegrationSlug(null);
    setShowListProductModal(false);
  }, [setIntegrationsFilterIntegrationSlug, setIntegrationsProduct, setIntegrationsRecoveryContext, setShowListProductModal]);
  const handleCloseListProduct = useCallback((): void => {
    setShowListProductModal(false);
    setListProductPreset(null);
  }, [setShowListProductModal, setListProductPreset]);
  const handleListProductSuccess = useCallback((): void => {
    setListProductPreset(null);
    setIntegrationsRecoveryContext(null);
    if (integrationsProduct !== null) refreshProductListingsData(integrationsProduct.id);
    baseHandleListProductSuccess();
  }, [baseHandleListProductSuccess, integrationsProduct, refreshProductListingsData, setIntegrationsRecoveryContext, setListProductPreset]);
  return { handleCloseIntegrations, handleCloseListProduct, handleListProductSuccess };
}

function useListingActionHandlers({
  modalOperations,
  refreshProductListingsData,
}: {
  modalOperations: IntegrationModalOperations;
  refreshProductListingsData: (productId: string) => void;
}): Pick<ProductListModalsContextValue, 'handleOpenExportSettings' | 'handleStartListing'> {
  const handleOpenExportSettings = useCallback(
    (product: ProductWithImages): void => {
      modalOperations.setExportSettingsProduct(product);
      refreshProductListingsData(product.id);
    },
    [modalOperations, refreshProductListingsData]
  );
  const handleStartListing = useCallback(
    (integrationId: string, connectionId: string, options?: { autoSubmit?: boolean }): void => {
      modalOperations.setListProductPreset({
        integrationId,
        connectionId,
        ...(options?.autoSubmit === true ? { autoSubmit: true } : {}),
      });
      modalOperations.setShowListProductModal(true);
    },
    [modalOperations]
  );
  return { handleOpenExportSettings, handleStartListing };
}

export function useIntegrationModalControls({
  prefetchIntegrationSelectionData,
  prefetchProductListingsData,
  refreshProductListingsData,
}: {
  prefetchIntegrationSelectionData: () => void;
  prefetchProductListingsData: (productId: string) => void;
  refreshProductListingsData: (productId: string) => void;
}): IntegrationControls {
  const [integrationsRecoveryContext, setIntegrationsRecoveryContext] =
    useState<ProductListingsRecoveryContext | null>(null);
  const [integrationsFilterIntegrationSlug, setIntegrationsFilterIntegrationSlug] =
    useState<string | null>(null);
  const modalOperations = useIntegrationModalOperations();
  const handleOpenIntegrationsModal = useOpenIntegrationsModalHandler({
    prefetchIntegrationSelectionData,
    prefetchProductListingsData,
    refreshProductListingsData,
    setIntegrationsFilterIntegrationSlug,
    setIntegrationsProduct: modalOperations.setIntegrationsProduct,
    setIntegrationsRecoveryContext,
  });
  const lifecycleHandlers = useIntegrationLifecycleHandlers({
    ...modalOperations,
    baseHandleListProductSuccess: modalOperations.handleListProductSuccess,
    refreshProductListingsData,
    setIntegrationsFilterIntegrationSlug,
    setIntegrationsRecoveryContext,
  });
  const listingActionHandlers = useListingActionHandlers({
    modalOperations,
    refreshProductListingsData,
  });

  return {
    ...lifecycleHandlers,
    ...listingActionHandlers,
    handleOpenIntegrationsModal,
    integrationsProduct: modalOperations.integrationsProduct,
    integrationsRecoveryContext,
    integrationsFilterIntegrationSlug,
    showListProductModal: modalOperations.showListProductModal,
    listProductPreset: modalOperations.listProductPreset,
    exportSettingsProduct: modalOperations.exportSettingsProduct,
    setExportSettingsProduct: modalOperations.setExportSettingsProduct,
    refreshListingBadges: modalOperations.refreshListingBadges,
  };
}
