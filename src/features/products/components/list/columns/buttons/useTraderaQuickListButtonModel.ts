'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import {
  useCreateListingMutation,
  useTraderaQuickExportConnection,
  useTraderaQuickExportFeedback,
  useTraderaQuickExportPolling,
} from '@/features/integrations/product-integrations-adapter';
import type { PersistedTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import { useCustomFields } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { hasProductMarketplaceExclusionSelection } from '@/shared/lib/products/utils/marketplace-exclusions';
import { useToast } from '@/shared/ui/toast';

import { normalizeMarketplaceStatus } from '../product-column-utils';
import { runTraderaQuickListAction } from './traderaQuickListAction';
import {
  resolveTraderaQuickListButtonView,
  type TraderaQuickListButtonViewModel,
} from './traderaQuickListButtonView';

export type TraderaQuickListButtonProps = {
  product: ProductWithImages;
  prefetchListings: () => void;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  showTraderaBadge?: boolean;
  traderaStatus?: string;
};

export type TraderaQuickListButtonModel = TraderaQuickListButtonViewModel & {
  shouldRender: boolean;
  showCheckmark: boolean;
  handleClick: () => void;
  prefetchListings: () => void;
};

type TraderaQuickListFeedbackRuntimeInput = {
  productId: string;
  traderaStatus: string;
  showTraderaBadge: boolean;
};

type TraderaQuickListFeedbackRuntime = {
  feedback: ReturnType<typeof useTraderaQuickExportFeedback>;
  effectiveLocalFeedback: PersistedTraderaQuickListFeedback | null;
  effectiveLocalFeedbackStatus: string | null;
  isClosedTraderaStatus: boolean;
  setTrackClosedQuickListAttempt: Dispatch<SetStateAction<boolean>>;
};

type TraderaQuickListClickHandlerInput = {
  productId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>['toast'];
  createListing: ReturnType<typeof useCreateListingMutation>['mutateAsync'];
  resolveConnection: ReturnType<typeof useTraderaQuickExportConnection>['resolveConnection'];
  enableDefaultScriptedConnection: ReturnType<
    typeof useTraderaQuickExportConnection
  >['enableDefaultScriptedConnection'];
  setFeedbackStatus: ReturnType<typeof useTraderaQuickExportFeedback>['setFeedbackStatus'];
  localFeedback: PersistedTraderaQuickListFeedback | null;
  feedbackStatus: string | null;
  submitting: boolean;
  isClosedTraderaStatus: boolean;
  setTrackClosedQuickListAttempt: Dispatch<SetStateAction<boolean>>;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  prefetchListings: () => void;
};

const resolveQuickListFeedbackStatus = (
  isClosedTraderaStatus: boolean,
  traderaStatus: string
): string => {
  if (isClosedTraderaStatus) return 'not_started';
  return traderaStatus;
};

const resolveQuickListFeedbackShowsBadge = (
  isClosedTraderaStatus: boolean,
  trackClosedQuickListAttempt: boolean,
  showTraderaBadge: boolean
): boolean => {
  if (isClosedTraderaStatus) return !trackClosedQuickListAttempt;
  return showTraderaBadge;
};

const resolveEffectiveLocalFeedback = (
  isClosedTraderaStatus: boolean,
  trackClosedQuickListAttempt: boolean,
  localFeedback: PersistedTraderaQuickListFeedback | null
): PersistedTraderaQuickListFeedback | null => {
  if (isClosedTraderaStatus && !trackClosedQuickListAttempt) return null;
  return localFeedback;
};

const useCompletedCheckmark = (feedbackStatus: string | null): boolean => {
  const [showCheckmark, setShowCheckmark] = useState(false);
  useEffect(() => {
    if (feedbackStatus !== 'completed') {
      setShowCheckmark(false);
      return undefined;
    }
    setShowCheckmark(true);
    const timerId = window.setTimeout(() => setShowCheckmark(false), 3000);
    return () => window.clearTimeout(timerId);
  }, [feedbackStatus]);
  return showCheckmark;
};

const useClosedQuickListAttempt = (
  isClosedTraderaStatus: boolean
): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const [trackClosedQuickListAttempt, setTrackClosedQuickListAttempt] = useState(false);
  useEffect(() => {
    if (!isClosedTraderaStatus) setTrackClosedQuickListAttempt(false);
  }, [isClosedTraderaStatus]);
  return [trackClosedQuickListAttempt, setTrackClosedQuickListAttempt];
};

const shouldIgnoreQuickListClick = (
  submitting: boolean,
  feedbackStatus: string | null
): boolean => submitting || feedbackStatus === 'queued';

const useTraderaQuickListFeedbackRuntime = ({
  productId,
  traderaStatus,
  showTraderaBadge,
}: TraderaQuickListFeedbackRuntimeInput): TraderaQuickListFeedbackRuntime => {
  const isClosedTraderaStatus = normalizeMarketplaceStatus(traderaStatus) === 'closed';
  const [trackClosedQuickListAttempt, setTrackClosedQuickListAttempt] =
    useClosedQuickListAttempt(isClosedTraderaStatus);
  const feedbackStatus = resolveQuickListFeedbackStatus(isClosedTraderaStatus, traderaStatus);
  const feedbackShowsBadge = resolveQuickListFeedbackShowsBadge(
    isClosedTraderaStatus,
    trackClosedQuickListAttempt,
    showTraderaBadge
  );
  const feedback = useTraderaQuickExportFeedback(productId, feedbackStatus, feedbackShowsBadge);
  const effectiveLocalFeedback = resolveEffectiveLocalFeedback(
    isClosedTraderaStatus,
    trackClosedQuickListAttempt,
    feedback.localFeedback
  );
  const effectiveLocalFeedbackStatus = effectiveLocalFeedback?.status ?? null;
  useTraderaQuickExportPolling(productId, effectiveLocalFeedback, feedback.setFeedbackStatus);

  return {
    feedback,
    effectiveLocalFeedback,
    effectiveLocalFeedbackStatus,
    isClosedTraderaStatus,
    setTrackClosedQuickListAttempt,
  };
};

const useTraderaQuickListClickHandler = (
  input: TraderaQuickListClickHandlerInput
): (() => void) => {
  const localFeedbackRef = useRef(input.localFeedback);
  localFeedbackRef.current = input.localFeedback;

  return useCallback((): void => {
    if (shouldIgnoreQuickListClick(input.submitting, input.feedbackStatus)) return;
    if (input.isClosedTraderaStatus) input.setTrackClosedQuickListAttempt(true);
    input.setSubmitting(true);
    input.setFeedbackStatus('processing');
    void runTraderaQuickListAction({
      productId: input.productId,
      queryClient: input.queryClient,
      toast: input.toast,
      createListing: input.createListing,
      resolveConnection: input.resolveConnection,
      enableDefaultScriptedConnection: input.enableDefaultScriptedConnection,
      setFeedbackStatus: input.setFeedbackStatus,
      getLocalFeedback: () => localFeedbackRef.current,
      onOpenIntegrations: input.onOpenIntegrations,
      prefetchListings: input.prefetchListings,
    }).finally(() => input.setSubmitting(false));
  }, [input]);
};

export function useTraderaQuickListButtonModel(
  props: TraderaQuickListButtonProps
): TraderaQuickListButtonModel {
  const { product, prefetchListings, onOpenIntegrations, showTraderaBadge = false } = props;
  const traderaStatus = props.traderaStatus ?? 'not_started';
  const productId = product.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const customFieldsQuery = useCustomFields();
  const createListingMutation = useCreateListingMutation(productId);
  const [submitting, setSubmitting] = useState(false);
  const { resolveConnection, enableDefaultScriptedConnection } =
    useTraderaQuickExportConnection(productId);
  const runtime = useTraderaQuickListFeedbackRuntime({
    productId,
    traderaStatus,
    showTraderaBadge,
  });
  const showCheckmark = useCompletedCheckmark(runtime.effectiveLocalFeedbackStatus);
  const isTraderaMarketplaceExcluded = hasProductMarketplaceExclusionSelection({
    customFieldDefinitions: customFieldsQuery.data,
    customFieldValues: product.customFields,
    marketplaceLabelOrAlias: 'Tradera',
  });
  const handleClick = useTraderaQuickListClickHandler({
    productId,
    queryClient,
    toast,
    createListing: createListingMutation.mutateAsync,
    resolveConnection,
    enableDefaultScriptedConnection,
    setFeedbackStatus: runtime.feedback.setFeedbackStatus,
    localFeedback: runtime.effectiveLocalFeedback,
    feedbackStatus: runtime.effectiveLocalFeedbackStatus,
    submitting,
    isClosedTraderaStatus: runtime.isClosedTraderaStatus,
    setTrackClosedQuickListAttempt: runtime.setTrackClosedQuickListAttempt,
    setSubmitting,
    onOpenIntegrations,
    prefetchListings,
  });

  return {
    ...resolveTraderaQuickListButtonView({
      normalizedTraderaStatus: runtime.feedback.normalizedTraderaStatus,
      localFeedbackStatus: runtime.effectiveLocalFeedbackStatus,
      localFeedback: runtime.effectiveLocalFeedback,
      submitting,
      hasServerStatus: runtime.feedback.hasServerStatus,
      serverStatusInFlight: runtime.feedback.serverStatusInFlight,
      isTraderaMarketplaceExcluded,
      traderaStatus,
      isClosedTraderaStatus: runtime.isClosedTraderaStatus,
    }),
    shouldRender: !showTraderaBadge,
    showCheckmark,
    handleClick,
    prefetchListings,
  };
}
