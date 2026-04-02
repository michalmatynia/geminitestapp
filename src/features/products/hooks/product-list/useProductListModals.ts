'use client';

import { useCallback, useState } from 'react';

import { useIntegrationModalOperations } from '@/features/integrations/public';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations';
import type { ProductWithImages, ProductDraft } from '@/shared/contracts/products';
import type { Toast } from '@/shared/contracts/ui';

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
}) {
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

  const handleOpenCreate = useCallback(() => {
    setCreateDraft(null);
    handleOpenCreateModal();
  }, [handleOpenCreateModal]);

  const handleOpenIntegrationsModal = useCallback(
    (
      product: ProductWithImages,
      recoveryContext?: ProductListingsRecoveryContext,
      filterIntegrationSlug?: string | null
    ) => {
      prefetchIntegrationSelectionData();
      prefetchProductListingsData(product.id);
      setIntegrationsRecoveryContext(recoveryContext ?? null);
      setIntegrationsFilterIntegrationSlug(filterIntegrationSlug?.trim() || null);
      setIntegrationsProduct(product);
    },
    [
      prefetchIntegrationSelectionData,
      prefetchProductListingsData,
      setIntegrationsFilterIntegrationSlug,
      setIntegrationsProduct,
      setIntegrationsRecoveryContext,
    ]
  );

  const handleOpenExportSettings = useCallback(
    (product: ProductWithImages) => {
      setExportSettingsProduct(product);
      refreshProductListingsData(product.id);
    },
    [refreshProductListingsData, setExportSettingsProduct]
  );

  const handleCloseIntegrations = useCallback(() => {
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

  const handleCloseListProduct = useCallback(() => {
    setShowListProductModal(false);
    setListProductPreset(null);
  }, [setShowListProductModal, setListProductPreset]);

  const handleListProductSuccess = useCallback(() => {
    setListProductPreset(null);
    setIntegrationsRecoveryContext(null);
    if (integrationsProduct?.id) {
      refreshProductListingsData(integrationsProduct.id);
    }
    baseHandleListProductSuccess();
  }, [
    baseHandleListProductSuccess,
    integrationsProduct?.id,
    refreshProductListingsData,
    setIntegrationsRecoveryContext,
    setListProductPreset,
  ]);

  const handleStartListing = useCallback(
    (
      integrationId: string,
      connectionId: string,
      options?: { autoSubmit?: boolean }
    ) => {
      setListProductPreset({
        integrationId,
        connectionId,
        ...(options?.autoSubmit ? { autoSubmit: true } : {}),
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

  const handleCloseIntegrationModal = useCallback(() => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);

  const handleSelectIntegrationFromModal = useCallback(
    (integrationId: string, connectionId: string): void => {
      setShowIntegrationModal(false);
      if (isMassListing) {
        const ids = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
        setMassListProductIds(ids);
        setMassListIntegration({ integrationId, connectionId });
      }
    },
    [isMassListing, rowSelection]
  );

  const handleCloseMassList = useCallback(() => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
  }, []);

  const handleMassListSuccess = useCallback(() => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
    toast('Products listed successfully.', { variant: 'success' });
    void refreshListingBadges();
  }, [toast, refreshListingBadges]);

  const handleAddToMarketplace = useCallback(() => {
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
