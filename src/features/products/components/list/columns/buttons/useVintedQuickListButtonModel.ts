'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import {
  useCreateListingMutation,
  useVintedQuickExportConnection,
  useVintedQuickExportFeedback,
  useVintedQuickExportPolling,
} from '@/features/integrations/product-integrations-adapter';
import type { PersistedVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { useToast } from '@/shared/ui/toast';

import { runVintedQuickListAction } from './vintedQuickListAction';
import {
  resolveVintedQuickListButtonView,
  type VintedQuickListButtonViewModel,
} from './vintedQuickListButtonView';

export type VintedQuickListButtonProps = {
  product: ProductWithImages;
  prefetchListings: () => void;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  showVintedBadge?: boolean;
  vintedStatus?: string;
};

export type VintedQuickListButtonModel = VintedQuickListButtonViewModel & {
  shouldRender: boolean;
  showCheckmark: boolean;
  handleClick: () => void;
  prefetchListings: () => void;
};

type VintedQuickListClickHandlerInput = {
  productId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>['toast'];
  createListing: ReturnType<typeof useCreateListingMutation>['mutateAsync'];
  resolveConnection: ReturnType<typeof useVintedQuickExportConnection>['resolveConnection'];
  setFeedbackStatus: ReturnType<typeof useVintedQuickExportFeedback>['setFeedbackStatus'];
  localFeedback: PersistedVintedQuickListFeedback | null;
  feedbackStatus: string | null;
  submitting: boolean;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
  prefetchListings: () => void;
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

const shouldIgnoreQuickListClick = (
  submitting: boolean,
  feedbackStatus: string | null
): boolean => submitting || feedbackStatus === 'queued';

const useVintedQuickListClickHandler = (
  input: VintedQuickListClickHandlerInput
): (() => void) => {
  const localFeedbackRef = useRef(input.localFeedback);
  localFeedbackRef.current = input.localFeedback;

  return useCallback((): void => {
    if (shouldIgnoreQuickListClick(input.submitting, input.feedbackStatus)) return;
    input.setSubmitting(true);
    input.setFeedbackStatus('processing');
    void runVintedQuickListAction({
      productId: input.productId,
      queryClient: input.queryClient,
      toast: input.toast,
      createListing: input.createListing,
      resolveConnection: input.resolveConnection,
      setFeedbackStatus: input.setFeedbackStatus,
      getLocalFeedback: () => localFeedbackRef.current,
      onOpenIntegrations: input.onOpenIntegrations,
      prefetchListings: input.prefetchListings,
    }).finally(() => input.setSubmitting(false));
  }, [input]);
};

export function useVintedQuickListButtonModel(
  props: VintedQuickListButtonProps
): VintedQuickListButtonModel {
  const { product, prefetchListings, onOpenIntegrations, showVintedBadge = false } = props;
  const vintedStatus = props.vintedStatus ?? 'not_started';
  const productId = product.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createListingMutation = useCreateListingMutation(productId);
  const [submitting, setSubmitting] = useState(false);
  const { resolveConnection } = useVintedQuickExportConnection(productId);
  const feedback = useVintedQuickExportFeedback(productId, vintedStatus, showVintedBadge);
  useVintedQuickExportPolling(productId, feedback.localFeedback, feedback.setFeedbackStatus);
  const showCheckmark = useCompletedCheckmark(feedback.localFeedbackStatus);
  const handleClick = useVintedQuickListClickHandler({
    productId,
    queryClient,
    toast,
    createListing: createListingMutation.mutateAsync,
    resolveConnection,
    setFeedbackStatus: feedback.setFeedbackStatus,
    localFeedback: feedback.localFeedback,
    feedbackStatus: feedback.localFeedbackStatus,
    submitting,
    setSubmitting,
    onOpenIntegrations,
    prefetchListings,
  });

  return {
    ...resolveVintedQuickListButtonView({
      normalizedVintedStatus: feedback.normalizedVintedStatus,
      localFeedbackStatus: feedback.localFeedbackStatus,
      localFeedback: feedback.localFeedback,
      submitting,
      hasServerStatus: feedback.hasServerStatus,
      serverStatusInFlight: feedback.serverStatusInFlight,
      vintedStatus,
    }),
    shouldRender: showVintedBadge === false,
    showCheckmark,
    handleClick,
    prefetchListings,
  };
}
