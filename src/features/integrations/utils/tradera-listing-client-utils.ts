import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';

export const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const buildCanonicalTraderaItemUrl = (externalListingId: string): string =>
  `https://www.tradera.com/item/${externalListingId}`;

export const resolveListingUrlFromListing = (
  listing: ProductListingWithDetails
): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const directListingUrl = readString(marketplaceData['listingUrl']);
  if (directListingUrl) return directListingUrl;
  return listing.externalListingId
    ? buildCanonicalTraderaItemUrl(listing.externalListingId)
    : null;
};

export const resolveTraderaRequestId = (
  listing: ProductListingWithDetails
): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  return readString(pendingExecution['requestId']) ?? readString(lastExecution['requestId']);
};

export const resolveCompletedAtFromListing = (
  listing: ProductListingWithDetails
): number | null => {
  const traderaData = toRecord(toRecord(listing.marketplaceData)['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawCompletedAt =
    readString(metadata['completedAt']) ?? readString(listing.listedAt ?? null);
  if (!rawCompletedAt) return null;
  const parsed = Date.parse(rawCompletedAt);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatCompletedAt = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

export const resolveListingUrl = (
  feedbackListingUrl: string | null | undefined,
  feedbackExternalListingId: string | null | undefined,
  listing?: ProductListingWithDetails | null | undefined
): string | null => {
  const listingMarketplaceData = toRecord(listing?.marketplaceData);
  const directListingUrl =
    readString(listingMarketplaceData['listingUrl']) ?? feedbackListingUrl ?? null;
  if (directListingUrl) return directListingUrl;
  const externalListingId =
    listing?.externalListingId ?? feedbackExternalListingId ?? null;
  return externalListingId ? buildCanonicalTraderaItemUrl(externalListingId) : null;
};

export const resolveCompletedAtFromFeedbackAndListing = (
  feedbackCompletedAt: number | null | undefined,
  listing?: ProductListingWithDetails | null | undefined
): string | null => {
  const formatted = formatCompletedAt(feedbackCompletedAt ?? null);
  if (formatted) return formatted;
  if (!listing) return null;
  const fromListing = resolveCompletedAtFromListing(listing);
  return formatCompletedAt(fromListing);
};
