'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useGenericExportToBaseMutation } from '@/features/integrations/product-integrations-adapter';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { runBaseQuickExport } from './BaseQuickExportButton.action';
import { resolveBaseQuickExportContext } from './BaseQuickExportButton.context';
import type { BaseQuickExportButtonProps } from './BaseQuickExportButton.types';
import {
  resolveBaseQuickExportButtonViewState,
  type BaseQuickExportButtonViewState,
} from './BaseQuickExportButton.view-model';
import {
  useBaseQuickExportDecision,
  type BaseQuickExportDecision,
} from './useBaseQuickExportDecision';
import { useBaseQuickExportLock } from './useBaseQuickExportLock';
import { useBaseQuickExportTracking } from './useBaseQuickExportTracking';

export type { BaseQuickExportButtonProps } from './BaseQuickExportButton.types';

export type BaseQuickExportButtonModel = BaseQuickExportButtonViewState &
  Pick<
    BaseQuickExportDecision,
    | 'existingSkuDecision'
    | 'linkExistingPending'
    | 'handleCloseDecisionModal'
    | 'handleSetupNewConnection'
    | 'handleLinkExistingProduct'
  > & {
    showMarketplaceBadge: boolean;
    prefetchListings: () => void;
    handleButtonClick: () => void;
  };

type BaseQuickExportRunHandlerInput = {
  props: BaseQuickExportButtonProps;
  quickExportMutation: ReturnType<typeof useGenericExportToBaseMutation>;
  lock: ReturnType<typeof useBaseQuickExportLock>;
  tracking: ReturnType<typeof useBaseQuickExportTracking>;
  resolveQuickExportContext: () => Promise<ReturnType<typeof resolveBaseQuickExportContext> extends Promise<infer T> ? T : never>;
  setExistingSkuDecision: BaseQuickExportDecision['setExistingSkuDecision'];
  toast: ReturnType<typeof useToast>['toast'];
};

type BaseQuickExportButtonClickInput = {
  viewState: BaseQuickExportButtonViewState;
  onOpenIntegrations: BaseQuickExportButtonProps['onOpenIntegrations'];
  runQuickExport: () => void;
};

const useBaseQuickExportContextResolver = (
  queryClient: ReturnType<typeof useQueryClient>,
  toast: ReturnType<typeof useToast>['toast']
): (() => ReturnType<typeof resolveBaseQuickExportContext>) =>
  useCallback(
    async () => await resolveBaseQuickExportContext({ queryClient, toast }),
    [queryClient, toast]
  );

const useBaseQuickExportRunHandler = ({
  props,
  quickExportMutation,
  lock,
  tracking,
  resolveQuickExportContext,
  setExistingSkuDecision,
  toast,
}: BaseQuickExportRunHandlerInput): (() => void) =>
  useCallback((): void => {
    void runBaseQuickExport({
      product: props.product,
      showMarketplaceBadge: props.showMarketplaceBadge,
      quickExportMutation,
      lock,
      resolveQuickExportContext,
      setExistingSkuDecision,
      tracking,
      prefetchListings: props.prefetchListings,
      toast,
    }).catch((error: unknown) => {
      logClientError(error);
    });
  }, [lock, props, quickExportMutation, resolveQuickExportContext, setExistingSkuDecision, toast, tracking]);

const useBaseQuickExportButtonClick = ({
  viewState,
  onOpenIntegrations,
  runQuickExport,
}: BaseQuickExportButtonClickInput): (() => void) =>
  useCallback((): void => {
    if (viewState.isFailureState) {
      onOpenIntegrations?.(viewState.recoveryContext);
      return;
    }
    if (viewState.shouldManageExistingListing) {
      onOpenIntegrations?.();
      return;
    }
    runQuickExport();
  }, [onOpenIntegrations, runQuickExport, viewState]);

export function useBaseQuickExportButtonModel(
  props: BaseQuickExportButtonProps
): BaseQuickExportButtonModel {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const quickExportMutation = useGenericExportToBaseMutation();
  const lock = useBaseQuickExportLock(props.product.id);
  const tracking = useBaseQuickExportTracking({
    productId: props.product.id,
    showMarketplaceBadge: props.showMarketplaceBadge,
  });
  const decision = useBaseQuickExportDecision({
    productId: props.product.id,
    queryClient,
    prefetchListings: props.prefetchListings,
    onOpenIntegrations: props.onOpenIntegrations,
    toast,
  });
  const resolveQuickExportContext = useBaseQuickExportContextResolver(queryClient, toast);
  const viewState = resolveBaseQuickExportButtonViewState({
    status: props.status,
    showMarketplaceBadge: props.showMarketplaceBadge,
    quickExportMutationPending: quickExportMutation.isPending,
    quickExportLocked: lock.locked,
    trackedExportRunStatus: tracking.trackedExportRunStatus,
    trackedExportRunContextId: tracking.trackedExportRunContextId,
    trackedExportRunErrorMessage: tracking.trackedExportRunErrorMessage,
  });
  const runQuickExport = useBaseQuickExportRunHandler({
    props,
    quickExportMutation,
    lock,
    tracking,
    resolveQuickExportContext,
    setExistingSkuDecision: decision.setExistingSkuDecision,
    toast,
  });
  const handleButtonClick = useBaseQuickExportButtonClick({
    viewState,
    onOpenIntegrations: props.onOpenIntegrations,
    runQuickExport,
  });

  return {
    ...viewState,
    existingSkuDecision: decision.existingSkuDecision,
    linkExistingPending: decision.linkExistingPending,
    handleCloseDecisionModal: decision.handleCloseDecisionModal,
    handleSetupNewConnection: decision.handleSetupNewConnection,
    handleLinkExistingProduct: decision.handleLinkExistingProduct,
    showMarketplaceBadge: props.showMarketplaceBadge,
    prefetchListings: props.prefetchListings,
    handleButtonClick,
  };
}
