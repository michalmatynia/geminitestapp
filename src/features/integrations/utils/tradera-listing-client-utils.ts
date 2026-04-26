import type {
  PersistedQuickExportFeedback,
  ProductListingWithDetails,
} from '@/shared/contracts/integrations/listings';

export const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

export const buildCanonicalTraderaItemUrl = (externalListingId: string): string =>
  `https://www.tradera.com/item/${externalListingId}`;

export const resolveListingUrlFromListing = (
  listing: ProductListingWithDetails
): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const directListingUrl = readString(marketplaceData['listingUrl']);
  if (directListingUrl !== null) return directListingUrl;
  return listing.externalListingId !== null
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

export const resolveTraderaRunIdFromListing = (
  listing: ProductListingWithDetails
): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawResult = toRecord(metadata['rawResult']);
  return (
    readString(pendingExecution['runId']) ??
    readString(metadata['runId']) ??
    readString(lastExecution['runId']) ??
    readString(rawResult['runId'])
  );
};

export const resolveTraderaFailureReasonFromListing = (
  listing: ProductListingWithDetails
): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  return readString(listing.failureReason) ?? readString(lastExecution['error']);
};

export const resolveCompletedAtFromListing = (
  listing: ProductListingWithDetails
): number | null => {
  const traderaData = toRecord(toRecord(listing.marketplaceData)['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawCompletedAt =
    readString(metadata['completedAt']) ??
    readString(lastExecution['executedAt']) ??
    readString(listing.listedAt ?? null);
  if (rawCompletedAt === null) return null;
  const parsed = Date.parse(rawCompletedAt);
  return Number.isFinite(parsed) ? parsed : null;
};

export const resolveDuplicateLinkedFromListing = (
  listing?: ProductListingWithDetails | null | undefined
): boolean => {
  const traderaData = toRecord(toRecord(listing?.marketplaceData)['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawResult = toRecord(metadata['rawResult']);
  const latestStage = readString(metadata['latestStage']);
  const duplicateMatchStrategy =
    readString(metadata['duplicateMatchStrategy']) ?? resolveDuplicateMatchStrategyFromRunResult(rawResult);
  return (
    readBoolean(metadata['duplicateLinked']) === true ||
    resolveDuplicateLinkedFromRunResult(rawResult, latestStage) ||
    Boolean(duplicateMatchStrategy)
  );
};

export const resolveDuplicateMatchStrategyFromListing = (
  listing?: ProductListingWithDetails | null | undefined
): string | null => {
  const traderaData = toRecord(toRecord(listing?.marketplaceData)['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawResult = toRecord(metadata['rawResult']);
  return readString(metadata['duplicateMatchStrategy']) ?? resolveDuplicateMatchStrategyFromRunResult(rawResult);
};

export const resolveDuplicateMatchStrategyFromRunResult = (
  rawResult?: unknown
): string | null => {
  const result = toRecord(rawResult);
  return readString(result['duplicateMatchStrategy']);
};

export const resolveDuplicateLinkedFromRunResult = (
  rawResult?: unknown,
  latestStage?: string | null | undefined
): boolean => {
  const result = toRecord(rawResult);
  const resolvedLatestStage = latestStage ?? readString(result['stage']);
  return (
    readBoolean(result['duplicateLinked']) === true ||
    resolvedLatestStage === 'duplicate_linked' ||
    Boolean(resolveDuplicateMatchStrategyFromRunResult(result))
  );
};

export const resolveDuplicateLinkedFromFeedback = (
  feedback?: PersistedQuickExportFeedback | null | undefined
): boolean => {
  const metadata = toRecord(feedback?.metadata);
  const rawResult = toRecord(metadata['rawResult']);
  const latestStage = readString(metadata['latestStage']);
  const duplicateMatchStrategy = resolveDuplicateMatchStrategyFromFeedbackParts({
    feedback,
    metadata,
    rawResult,
  });
  return (
    readBoolean(feedback?.duplicateLinked) === true ||
    readBoolean(metadata['duplicateLinked']) === true ||
    resolveDuplicateLinkedFromRunResult(rawResult, latestStage) ||
    Boolean(duplicateMatchStrategy)
  );
};

const resolveDuplicateMatchStrategyFromFeedbackParts = ({
  feedback,
  metadata,
  rawResult,
}: {
  feedback?: PersistedQuickExportFeedback | null | undefined;
  metadata: Record<string, unknown>;
  rawResult: Record<string, unknown>;
}): string | null =>
  readString(feedback?.duplicateMatchStrategy) ??
  readString(metadata['duplicateMatchStrategy']) ??
  resolveDuplicateMatchStrategyFromRunResult(rawResult);

export const resolveDuplicateMatchStrategyFromFeedback = (
  feedback?: PersistedQuickExportFeedback | null | undefined
): string | null => {
  const metadata = toRecord(feedback?.metadata);
  const rawResult = toRecord(metadata['rawResult']);
  return (
    readString(feedback?.duplicateMatchStrategy) ??
    readString(metadata['duplicateMatchStrategy']) ??
    readString(rawResult['duplicateMatchStrategy'])
  );
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
    readString(listingMarketplaceData['listingUrl']) ?? readString(feedbackListingUrl);
  if (directListingUrl !== null) return directListingUrl;
  const externalListingId =
    readString(listing?.externalListingId) ?? readString(feedbackExternalListingId);
  return externalListingId !== null ? buildCanonicalTraderaItemUrl(externalListingId) : null;
};

export const resolveCompletedAtFromFeedbackAndListing = (
  feedbackCompletedAt: number | null | undefined,
  listing?: ProductListingWithDetails | null | undefined
): string | null => {
  const formatted = formatCompletedAt(feedbackCompletedAt ?? null);
  if (formatted !== null) return formatted;
  if (listing === null || listing === undefined) return null;
  const fromListing = resolveCompletedAtFromListing(listing);
  return formatCompletedAt(fromListing);
};
