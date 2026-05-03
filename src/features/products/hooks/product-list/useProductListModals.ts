'use client';

import type { Toast } from '@/shared/contracts/ui/base';

import {
  type ProductListModalsContextValue,
  useCreateDraftControls,
  useIntegrationModalControls,
} from './useProductListModals.helpers';
import { useMassListingControls } from './useProductListModals.mass';

export type { ProductListModalsContextValue };

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
  const createControls = useCreateDraftControls(handleOpenCreateModal);
  const integrationControls = useIntegrationModalControls({
    prefetchIntegrationSelectionData,
    prefetchProductListingsData,
    refreshProductListingsData,
  });
  const massListingControls = useMassListingControls({
    prefetchIntegrationSelectionData,
    refreshListingBadges: integrationControls.refreshListingBadges,
    rowSelection,
    toast,
  });

  return {
    ...createControls,
    ...integrationControls,
    ...massListingControls,
  };
}
