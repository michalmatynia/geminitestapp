'use client';

import { useCallback, useState } from 'react';
import type { ProductWithImages, ProductDraftDto } from '@/shared/contracts/products';
import { useIntegrationOperations } from '@/shared/lib/integrations/hooks/useIntegrationOperations';
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
  const [createDraft, setCreateDraft] = useState<ProductDraftDto | null>(null);

  const {
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    listProductPreset,
    setListProductPreset,
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess: baseHandleListProductSuccess,
  } = useIntegrationOperations();

  const handleOpenCreate = useCallback(() => {
    setCreateDraft(null);
    handleOpenCreateModal();
  }, [handleOpenCreateModal]);

  const handleOpenIntegrationsModal = useCallback(
    (product: ProductWithImages) => {
      prefetchIntegrationSelectionData();
      prefetchProductListingsData(product.id);
      setIntegrationsProduct(product);
    },
    [prefetchIntegrationSelectionData, prefetchProductListingsData, setIntegrationsProduct]
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
    setShowListProductModal(false);
  }, [setIntegrationsProduct, setShowListProductModal]);

  const handleCloseListProduct = useCallback(() => {
    setShowListProductModal(false);
    setListProductPreset(null);
  }, [setShowListProductModal, setListProductPreset]);

  const handleListProductSuccess = useCallback(() => {
    setListProductPreset(null);
    baseHandleListProductSuccess();
  }, [setListProductPreset, baseHandleListProductSuccess]);

  const handleStartListing = useCallback(
    (integrationId: string, connectionId: string) => {
      setListProductPreset({ integrationId, connectionId });
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
    showListProductModal,
    listProductPreset,
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
  };
}
