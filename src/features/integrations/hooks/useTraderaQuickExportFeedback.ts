'use client';

import { useMemo } from 'react';
import {
  clearPersistedTraderaQuickListFeedback,
  persistTraderaQuickListFeedback,
  readPersistedTraderaQuickListFeedback,
  type PersistedTraderaQuickListFeedback,
  type TraderaQuickListFeedbackStatus,
} from '@/features/integrations/utils/traderaQuickListFeedback';
import {
  resolveCompletedAtFromListing,
  resolveDuplicateLinkedFromFeedback,
  resolveDuplicateLinkedFromListing,
  resolveDuplicateMatchStrategyFromFeedback,
  resolveDuplicateMatchStrategyFromListing,
  resolveTraderaFailureReasonFromListing,
  resolveListingUrlFromListing,
  resolveTraderaRequestId,
  resolveTraderaRunIdFromListing,
} from '@/features/integrations/utils/tradera-listing-client-utils';
import {
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from '@/features/integrations/utils/marketplace-status';
import type {
  ProductListingWithDetails,
  QuickExportFeedbackOptions as TraderaFeedbackOptions,
} from '@/shared/contracts/integrations/listings';

import {
  useMarketplaceQuickExportFeedback,
  type MarketplaceQuickExportFeedbackActions,
} from './useMarketplaceQuickExportFeedback';

export type { TraderaFeedbackOptions };

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const findTrackedTraderaListing = (
  listings: ProductListingWithDetails[],
  feedback: PersistedTraderaQuickListFeedback
): ProductListingWithDetails | null => {
  if (hasText(feedback.listingId)) {
    const byListingId = listings.find((listing) => listing.id === feedback.listingId);
    if (byListingId) return byListingId;
  }

  if (hasText(feedback.requestId)) {
    const byRequestId = listings.find(
      (listing) => resolveTraderaRequestId(listing) === feedback.requestId
    );
    if (byRequestId) return byRequestId;
  }

  if (hasText(feedback.externalListingId)) {
    const byExternalListingId = listings.find(
      (listing) => listing.externalListingId === feedback.externalListingId
    );
    if (byExternalListingId) return byExternalListingId;
  }

  return null;
};

const resolveTrackedTraderaDuplicateMetadata = (
  listing: ProductListingWithDetails,
  feedback: PersistedTraderaQuickListFeedback
): {
  duplicateLinked: boolean;
  duplicateMatchStrategy: string | null;
} => {
  const duplicateMatchStrategy =
    resolveDuplicateMatchStrategyFromListing(listing) ??
    resolveDuplicateMatchStrategyFromFeedback(feedback);

  return {
    duplicateLinked:
      resolveDuplicateLinkedFromListing(listing) || resolveDuplicateLinkedFromFeedback(feedback),
    duplicateMatchStrategy,
  };
};

export const buildTrackedTraderaFeedbackOptions = (
  listing: ProductListingWithDetails,
  feedback: PersistedTraderaQuickListFeedback
): TraderaFeedbackOptions => {
  const { duplicateLinked, duplicateMatchStrategy } =
    resolveTrackedTraderaDuplicateMetadata(listing, feedback);

  return {
    completedAt: resolveCompletedAtFromListing(listing),
    duplicateLinked,
    duplicateMatchStrategy,
    runId: feedback.runId ?? resolveTraderaRunIdFromListing(listing),
    requestId: feedback.requestId ?? resolveTraderaRequestId(listing),
    integrationId: listing.integrationId,
    connectionId: listing.connectionId,
    failureReason:
      feedback.failureReason ?? resolveTraderaFailureReasonFromListing(listing),
    listingId: listing.id,
    listingUrl: resolveListingUrlFromListing(listing),
    externalListingId: listing.externalListingId ?? feedback.externalListingId ?? null,
    metadata: {
      ...(feedback.metadata ?? {}),
      ...(duplicateMatchStrategy !== null ? { duplicateMatchStrategy } : {}),
    },
  };
};

export const isTrackedTraderaListingSuccess = (
  listing: ProductListingWithDetails,
  feedback: PersistedTraderaQuickListFeedback
): boolean =>
  SUCCESS_STATUSES.has(normalizeMarketplaceStatus(listing.status)) ||
  resolveDuplicateLinkedFromListing(listing) ||
  resolveDuplicateLinkedFromFeedback(feedback);

export type UseTraderaQuickExportFeedbackResult = {
  localFeedback: PersistedTraderaQuickListFeedback | null;
  localFeedbackStatus: TraderaQuickListFeedbackStatus | null;
  setFeedbackStatus: (
    status: TraderaQuickListFeedbackStatus | null,
    options?: TraderaFeedbackOptions
  ) => void;
  hasServerStatus: boolean;
  serverStatusInFlight: boolean;
  normalizedTraderaStatus: string;
};

export function useTraderaQuickExportFeedback(
  productId: string,
  traderaStatus: string,
  showTraderaBadge: boolean
): UseTraderaQuickExportFeedbackResult {
  const actions = useMemo<MarketplaceQuickExportFeedbackActions>(
    () => ({
      readFeedback: readPersistedTraderaQuickListFeedback,
      persistFeedback: persistTraderaQuickListFeedback,
      clearFeedback: clearPersistedTraderaQuickListFeedback,
      findTrackedListing: findTrackedTraderaListing,
      buildFeedbackOptions: buildTrackedTraderaFeedbackOptions,
      isTrackedListingSuccess: isTrackedTraderaListingSuccess,
    }),
    []
  );

  const result = useMarketplaceQuickExportFeedback(
    productId,
    traderaStatus,
    showTraderaBadge,
    actions,
    'Tradera'
  );

  const response: UseTraderaQuickExportFeedbackResult = {
    ...result,
    normalizedTraderaStatus: result.normalizedStatus,
  };

  return response;
}
