import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';

export const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const buildCanonicalVintedItemUrl = (externalListingId: string): string =>
  `https://www.vinted.pl/items/${externalListingId}`;

export const resolveVintedListingUrlFromListing = (
  listing: ProductListingWithDetails
): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const directListingUrl = readString(marketplaceData['listingUrl']);
  if (directListingUrl) return directListingUrl;
  return listing.externalListingId
    ? buildCanonicalVintedItemUrl(listing.externalListingId)
    : null;
};

export const resolveVintedRequestId = (
  listing: ProductListingWithDetails
): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const vintedData = toRecord(marketplaceData['vinted']);
  const pendingExecution = toRecord(vintedData['pendingExecution']);
  const lastExecution = toRecord(vintedData['lastExecution']);
  return readString(pendingExecution['requestId']) ?? readString(lastExecution['requestId']);
};

export const resolveVintedCompletedAtFromListing = (
  listing: ProductListingWithDetails
): number | null => {
  const vintedData = toRecord(toRecord(listing.marketplaceData)['vinted']);
  const lastExecution = toRecord(vintedData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawCompletedAt =
    readString(metadata['completedAt']) ??
    readString(lastExecution['executedAt']) ??
    readString(listing.listedAt ?? null);
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

export const resolveVintedListingUrl = (
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
  return externalListingId ? buildCanonicalVintedItemUrl(externalListingId) : null;
};

export const resolveVintedCompletedAtFromFeedbackAndListing = (
  feedbackCompletedAt: number | null | undefined,
  listing?: ProductListingWithDetails | null | undefined
): string | null => {
  const formatted = formatCompletedAt(feedbackCompletedAt ?? null);
  if (formatted) return formatted;
  if (!listing) return null;
  const fromListing = resolveVintedCompletedAtFromListing(listing);
  return formatCompletedAt(fromListing);
};
