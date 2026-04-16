'use client';

import { useMemo } from 'react';
import {
  clearPersistedVintedQuickListFeedback,
  persistVintedQuickListFeedback,
  readPersistedVintedQuickListFeedback,
  type PersistedVintedQuickListFeedback,
  type VintedQuickListFeedbackStatus,
} from '@/features/integrations/utils/vintedQuickListFeedback';
import {
  resolveVintedCompletedAtFromListing,
  resolveVintedListingUrlFromListing,
  resolveVintedRequestId,
} from '@/features/integrations/utils/vinted-listing-client-utils';
import type {
  ProductListingWithDetails,
  QuickExportFeedbackOptions as VintedFeedbackOptions,
} from '@/shared/contracts/integrations/listings';

import {
  useMarketplaceQuickExportFeedback,
  type MarketplaceQuickExportFeedbackActions,
} from './useMarketplaceQuickExportFeedback';

export type VintedQuickListStatus = VintedQuickListFeedbackStatus;
export type VintedQuickListFeedback = PersistedVintedQuickListFeedback;

export type { VintedFeedbackOptions };

export const findTrackedVintedListing = (
  listings: ProductListingWithDetails[],
  feedback: PersistedVintedQuickListFeedback
): ProductListingWithDetails | null => {
  if (feedback.listingId) {
    const byListingId = listings.find((listing) => listing.id === feedback.listingId);
    if (byListingId) return byListingId;
  }

  if (feedback.requestId) {
    const byRequestId = listings.find(
      (listing) => resolveVintedRequestId(listing) === feedback.requestId
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

export const buildTrackedVintedFeedbackOptions = (
  listing: ProductListingWithDetails,
  feedback: PersistedVintedQuickListFeedback
): VintedFeedbackOptions => ({
  completedAt: resolveVintedCompletedAtFromListing(listing),
  runId: feedback.runId ?? null,
  requestId: feedback.requestId ?? resolveVintedRequestId(listing),
  integrationId: listing.integrationId ?? feedback.integrationId ?? null,
  connectionId: listing.connectionId ?? feedback.connectionId ?? null,
  listingId: listing.id,
  listingUrl: resolveVintedListingUrlFromListing(listing),
  externalListingId: listing.externalListingId ?? feedback.externalListingId ?? null,
});

export function useVintedQuickExportFeedback(
  productId: string,
  vintedStatus: string,
  showVintedBadge: boolean
) {
  const actions: MarketplaceQuickExportFeedbackActions = useMemo(
    () => ({
      readFeedback: readPersistedVintedQuickListFeedback,
      persistFeedback: persistVintedQuickListFeedback,
      clearFeedback: clearPersistedVintedQuickListFeedback,
      findTrackedListing: findTrackedVintedListing as MarketplaceQuickExportFeedbackActions['findTrackedListing'],
      buildFeedbackOptions: buildTrackedVintedFeedbackOptions as MarketplaceQuickExportFeedbackActions['buildFeedbackOptions'],
    }),
    []
  );

  const result = useMarketplaceQuickExportFeedback(
    productId,
    vintedStatus,
    showVintedBadge,
    actions,
    'Vinted'
  );

  return {
    ...result,
    normalizedVintedStatus: result.normalizedStatus,
  };
}
