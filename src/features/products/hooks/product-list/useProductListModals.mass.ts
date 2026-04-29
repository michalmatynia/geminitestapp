'use client';

import { useCallback, useState } from 'react';

import type { Toast } from '@/shared/contracts/ui/base';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import type { ProductListModalsContextValue } from './useProductListModals.helpers';

type MassListingControls = Pick<
  ProductListModalsContextValue,
  | 'handleAddToMarketplace'
  | 'handleCloseIntegrationModal'
  | 'handleCloseMassList'
  | 'handleMassListSuccess'
  | 'handleSelectIntegrationFromModal'
  | 'isMassListing'
  | 'massListIntegration'
  | 'massListProductIds'
  | 'showIntegrationModal'
>;

function useMassListSuccessHandler({
  refreshListingBadges,
  resetMassListing,
  toast,
}: {
  refreshListingBadges: () => Promise<void>;
  resetMassListing: () => void;
  toast: Toast;
}): () => void {
  return useCallback((): void => {
    resetMassListing();
    toast('Products listed successfully.', { variant: 'success' });
    refreshListingBadges().catch((error: unknown) => {
      ErrorSystem.logWarning('Failed to refresh listing badges after mass list success', { error }).catch(() => {});
    });
  }, [refreshListingBadges, resetMassListing, toast]);
}

export function useMassListingControls({
  prefetchIntegrationSelectionData,
  refreshListingBadges,
  rowSelection,
  toast,
}: {
  prefetchIntegrationSelectionData: () => void;
  refreshListingBadges: () => Promise<void>;
  rowSelection: Record<string, boolean>;
  toast: Toast;
}): MassListingControls {
  const [massListIntegration, setMassListIntegration] = useState<{ integrationId: string; connectionId: string } | null>(null);
  const [massListProductIds, setMassListProductIds] = useState<string[]>([]);
  const [isMassListing, setIsMassListing] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const resetMassListing = useCallback((): void => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
  }, []);
  const handleCloseIntegrationModal = useCallback((): void => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);
  const handleSelectIntegrationFromModal = useCallback((integrationId: string, connectionId: string): void => {
    setShowIntegrationModal(false);
    if (isMassListing === true) {
      const ids = Object.keys(rowSelection).filter((id: string) => rowSelection[id] === true);
      setMassListProductIds(ids);
      setMassListIntegration({ integrationId, connectionId });
    }
  }, [isMassListing, rowSelection]);
  const handleAddToMarketplace = useCallback((): void => {
    prefetchIntegrationSelectionData();
    setIsMassListing(true);
    setShowIntegrationModal(true);
  }, [prefetchIntegrationSelectionData]);
  const handleMassListSuccess = useMassListSuccessHandler({ refreshListingBadges, resetMassListing, toast });

  return {
    massListIntegration,
    massListProductIds,
    isMassListing,
    showIntegrationModal,
    handleCloseIntegrationModal,
    handleSelectIntegrationFromModal,
    handleCloseMassList: resetMassListing,
    handleMassListSuccess,
    handleAddToMarketplace,
  };
}
