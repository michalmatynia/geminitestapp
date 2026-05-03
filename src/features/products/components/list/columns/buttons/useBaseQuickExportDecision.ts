'use client';

import { useCallback, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { useToast } from '@/shared/ui/toast';

import { linkExistingBaseProduct } from './BaseQuickExportButton.link-existing';
import type { ExistingSkuDecisionState } from './BaseQuickExportButton.types';

type Toast = ReturnType<typeof useToast>['toast'];

type UseBaseQuickExportDecisionInput = {
  productId: string;
  queryClient: QueryClient;
  prefetchListings: () => void;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  toast: Toast;
};

export type BaseQuickExportDecision = {
  existingSkuDecision: ExistingSkuDecisionState | null;
  setExistingSkuDecision: (decision: ExistingSkuDecisionState | null) => void;
  linkExistingPending: boolean;
  handleCloseDecisionModal: () => void;
  handleSetupNewConnection: () => void;
  handleLinkExistingProduct: () => void;
};

export const useBaseQuickExportDecision = ({
  productId,
  queryClient,
  prefetchListings,
  onOpenIntegrations,
  toast,
}: UseBaseQuickExportDecisionInput): BaseQuickExportDecision => {
  const [existingSkuDecision, setExistingSkuDecision] =
    useState<ExistingSkuDecisionState | null>(null);
  const [linkExistingPending, setLinkExistingPending] = useState(false);

  const handleCloseDecisionModal = useCallback((): void => {
    if (linkExistingPending) return;
    setExistingSkuDecision(null);
  }, [linkExistingPending]);

  const handleSetupNewConnection = useCallback((): void => {
    setExistingSkuDecision(null);
    if (onOpenIntegrations !== undefined) {
      onOpenIntegrations();
      return;
    }
    toast('Open integrations to set up a new Base.com connection.', { variant: 'info' });
  }, [onOpenIntegrations, toast]);

  const handleLinkExistingProduct = useCallback((): void => {
    if (existingSkuDecision === null || linkExistingPending) return;
    setLinkExistingPending(true);
    void linkExistingBaseProduct({
      productId,
      queryClient,
      decision: existingSkuDecision,
      prefetchListings,
      closeDecisionModal: () => setExistingSkuDecision(null),
      toast,
    }).finally(() => setLinkExistingPending(false));
  }, [existingSkuDecision, linkExistingPending, prefetchListings, productId, queryClient, toast]);

  return {
    existingSkuDecision,
    setExistingSkuDecision,
    linkExistingPending,
    handleCloseDecisionModal,
    handleSetupNewConnection,
    handleLinkExistingProduct,
  };
};
