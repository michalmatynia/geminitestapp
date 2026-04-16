'use client';

// useProductListModals: orchestrates create/edit/delete modal visibility and
// modal lifecycle callbacks. Keeps modal boolean state, editing payloads, and
// safe closure handlers in one place so the table and toolbars can remain
// thin.

// useProductListModals: coordinates modal open/close state and modal-scoped
// operations (integrations modal, list product modal, export settings, mass
// list) while enriching recovery contexts with persisted quick-list feedback
// where appropriate. Keeps modal logic local and side-effect free; persists
// transient feedback via integrations adapters when available.

import { useCallback, useState } from 'react';

import {
  useIntegrationModalOperations,
  isTraderaQuickExportRecoveryContext,
  isVintedQuickExportRecoveryContext,
  resolveProductListingsIntegrationScope,
  isTraderaIntegrationSlug,
  isVintedIntegrationSlug,
  readPersistedTraderaQuickListFeedback,
  readPersistedVintedQuickListFeedback,
} from '@/features/integrations/product-integrations-adapter';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { Toast } from '@/shared/contracts/ui/base';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

const enrichRecoveryContext = (
  productId: string,
  recoveryContext?: ProductListingsRecoveryContext
): ProductListingsRecoveryContext | null => {
  if (recoveryContext === undefined) return null;

  if (
    isTraderaQuickExportRecoveryContext(recoveryContext) === false &&
    isVintedQuickExportRecoveryContext(recoveryContext) === false
  ) {
    return recoveryContext;
  }

  const persistedFeedback = isTraderaQuickExportRecoveryContext(recoveryContext)
    ? readPersistedTraderaQuickListFeedback(productId)
    : readPersistedVintedQuickListFeedback(productId);
  if (persistedFeedback === null) return recoveryContext;

  const normalizedFeedbackStatus = persistedFeedback.status.trim().toLowerCase();
  if (
    normalizedFeedbackStatus === 'processing' ||
    normalizedFeedbackStatus === 'queued' ||
    normalizedFeedbackStatus === 'completed'
  ) {
    return null;
  }

  return {
    ...recoveryContext,
    runId: recoveryContext.runId ?? persistedFeedback.runId ?? null,
    failureReason:
      ('failureReason' in recoveryContext ? recoveryContext.failureReason : null) ??
      persistedFeedback.failureReason ?? null,
    requestId: recoveryContext.requestId ?? persistedFeedback.requestId ?? null,
    integrationId: recoveryContext.integrationId ?? persistedFeedback.integrationId ?? null,
    connectionId: recoveryContext.connectionId ?? persistedFeedback.connectionId ?? null,
  };
};

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

export function useProductListModals({
  handleOpenCreateModal,
  prefetchIntegrationSelectionData,
  prefetchProductListingsData,
  refreshProductListingsData,
  rowSelection,
  toast,
}: {
  handleOpenCreateModal: () => void;
  prefetchIntegrationSelectionData: () => void;
  prefetchProductListingsData: (productId: string) => void;
  refreshProductListingsData: (productId: string) => void;
  rowSelection: Record<string, boolean>;
  toast: Toast;
}): ProductListModalsContextValue {
  const [createDraft, setCreateDraft] = useState<ProductDraft | null>(null);
  const [integrationsRecoveryContext, setIntegrationsRecoveryContext] =
    useState<ProductListingsRecoveryContext | null>(null);
  const [integrationsFilterIntegrationSlug, setIntegrationsFilterIntegrationSlug] =
    useState<string | null>(null);

  const {
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    listProductPreset,
    setListProductPreset,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess: baseHandleListProductSuccess,
  } = useIntegrationModalOperations();

  const handleOpenCreate = useCallback((): void => {
    setCreateDraft(null);
    handleOpenCreateModal();
  }, [handleOpenCreateModal]);

  const handleOpenIntegrationsModal = useCallback(
    (
      product: ProductWithImages,
      recoveryContext?: ProductListingsRecoveryContext,
      filterIntegrationSlug?: string | null
    ): void => {
      const resolvedFilterIntegrationSlug = resolveProductListingsIntegrationScope({
        filterIntegrationSlug,
        recoveryContext,
      });
      const shouldRefreshListings =
        isTraderaIntegrationSlug(resolvedFilterIntegrationSlug) ||
        isVintedIntegrationSlug(resolvedFilterIntegrationSlug) ||
        isTraderaQuickExportRecoveryContext(recoveryContext) ||
        isVintedQuickExportRecoveryContext(recoveryContext);
      prefetchIntegrationSelectionData();
      prefetchProductListingsData(product.id);
      if (shouldRefreshListings === true) {
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

  const handleOpenExportSettings = useCallback(
    (product: ProductWithImages): void => {
      setExportSettingsProduct(product);
      refreshProductListingsData(product.id);
    },
    [refreshProductListingsData, setExportSettingsProduct]
  );

  const handleCloseIntegrations = useCallback((): void => {
    setIntegrationsProduct(null);
    setIntegrationsRecoveryContext(null);
    setIntegrationsFilterIntegrationSlug(null);
    setShowListProductModal(false);
  }, [
    setIntegrationsFilterIntegrationSlug,
    setIntegrationsProduct,
    setIntegrationsRecoveryContext,
    setShowListProductModal,
  ]);

  const handleCloseListProduct = useCallback((): void => {
    setShowListProductModal(false);
    setListProductPreset(null);
  }, [setShowListProductModal, setListProductPreset]);

  const handleListProductSuccess = useCallback((): void => {
    setListProductPreset(null);
    setIntegrationsRecoveryContext(null);
    if (integrationsProduct !== null) {
      refreshProductListingsData(integrationsProduct.id);
    }
    baseHandleListProductSuccess();
  }, [
    baseHandleListProductSuccess,
    integrationsProduct,
    refreshProductListingsData,
    setIntegrationsRecoveryContext,
    setListProductPreset,
  ]);

  const handleStartListing = useCallback(
    (
      integrationId: string,
      connectionId: string,
      options?: { autoSubmit?: boolean }
    ): void => {
      setListProductPreset({
        integrationId,
        connectionId,
        ...(options?.autoSubmit === true ? { autoSubmit: true } : {}),
      });
      setShowListProductModal(true);
    },
    [setListProductPreset, setShowListProductModal]
  );

  // Mass listing state
  const [massListIntegration, setMassListIntegration] = useState<{
    integrationId: string;
    connectionId: string;
  } | null>(null);
  const [massListProductIds, setMassListProductIds] = useState<string[]>([]);
  const [isMassListing, setIsMassListing] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  const handleCloseIntegrationModal = useCallback((): void => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);

  const handleSelectIntegrationFromModal = useCallback(
    (integrationId: string, connectionId: string): void => {
      setShowIntegrationModal(false);
      if (isMassListing === true) {
        const ids = Object.keys(rowSelection).filter((id: string) => rowSelection[id] === true);
        setMassListProductIds(ids);
        setMassListIntegration({ integrationId, connectionId });
      }
    },
    [isMassListing, rowSelection]
  );

  const handleCloseMassList = useCallback((): void => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
  }, []);

  const handleMassListSuccess = useCallback((): void => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
    toast('Products listed successfully.', { variant: 'success' });
    refreshListingBadges().catch((error: unknown) => {
      // Ignore background refresh errors
      ErrorSystem.logWarning('Failed to refresh listing badges after mass list success', { error }).catch(() => {});
    });
  }, [toast, refreshListingBadges]);

  const handleAddToMarketplace = useCallback((): void => {
    prefetchIntegrationSelectionData();
    setIsMassListing(true);
    setShowIntegrationModal(true);
  }, [prefetchIntegrationSelectionData]);

  return {
    createDraft,
    setCreateDraft,
    handleOpenCreate,
    handleOpenIntegrationsModal,
    handleOpenExportSettings,
    handleCloseIntegrations,
    handleCloseListProduct,
    handleListProductSuccess,
    handleStartListing,
    massListIntegration,
    massListProductIds,
    isMassListing,
    showIntegrationModal,
    handleCloseIntegrationModal,
    handleSelectIntegrationFromModal,
    handleCloseMassList,
    handleMassListSuccess,
    handleAddToMarketplace,
    integrationsProduct,
    integrationsRecoveryContext,
    integrationsFilterIntegrationSlug,
    showListProductModal,
    listProductPreset,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
  };
}
