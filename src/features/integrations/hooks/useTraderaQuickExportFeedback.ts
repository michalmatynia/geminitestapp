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
  resolveDuplicateLinkedFromListing,
  resolveListingUrlFromListing,
  resolveTraderaRequestId,
} from '@/features/integrations/utils/tradera-listing-client-utils';
import type {
  ProductListingWithDetails,
  QuickExportFeedbackOptions as TraderaFeedbackOptions,
} from '@/shared/contracts/integrations/listings';

import {
  useMarketplaceQuickExportFeedback,
  type MarketplaceQuickExportFeedbackActions,
} from './useMarketplaceQuickExportFeedback';

export type { TraderaFeedbackOptions };

export const findTrackedTraderaListing = (
  listings: ProductListingWithDetails[],
  feedback: PersistedTraderaQuickListFeedback
): ProductListingWithDetails | null => {
  if (feedback.listingId) {
    const byListingId = listings.find((listing) => listing.id === feedback.listingId);
    if (byListingId) return byListingId;
  }

  if (feedback.requestId) {
    const byRequestId = listings.find(
      (listing) => resolveTraderaRequestId(listing) === feedback.requestId
    );
    if (byRequestId) return byRequestId;
  }

  if (feedback.externalListingId) {
    const byExternalListingId = listings.find(
      (listing) => listing.externalListingId === feedback.externalListingId
    );
    if (byExternalListingId) return byExternalListingId;
  }

  return null;
};

export const buildTrackedTraderaFeedbackOptions = (
  listing: ProductListingWithDetails,
  feedback: PersistedTraderaQuickListFeedback
): TraderaFeedbackOptions => ({
  completedAt: resolveCompletedAtFromListing(listing),
  duplicateLinked: resolveDuplicateLinkedFromListing(listing),
  runId: feedback.runId ?? null,
  requestId: feedback.requestId ?? resolveTraderaRequestId(listing),
  integrationId: listing.integrationId ?? feedback.integrationId ?? null,
  connectionId: listing.connectionId ?? feedback.connectionId ?? null,
  listingId: listing.id,
  listingUrl: resolveListingUrlFromListing(listing),
  externalListingId: listing.externalListingId ?? feedback.externalListingId ?? null,
});

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
  const actions: MarketplaceQuickExportFeedbackActions = useMemo(
    () => ({
      readFeedback: readPersistedTraderaQuickListFeedback,
      persistFeedback: persistTraderaQuickListFeedback,
      clearFeedback: clearPersistedTraderaQuickListFeedback,
      findTrackedListing: findTrackedTraderaListing as MarketplaceQuickExportFeedbackActions['findTrackedListing'],
      buildFeedbackOptions: buildTrackedTraderaFeedbackOptions as MarketplaceQuickExportFeedbackActions['buildFeedbackOptions'],
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

  return {
    ...result,
    normalizedTraderaStatus: result.normalizedStatus,
  } as UseTraderaQuickExportFeedbackResult;
}
