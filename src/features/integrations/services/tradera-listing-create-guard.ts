import type { ProductListingCreateResponse } from '@/shared/contracts/integrations';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';

import { resolvePersistedTraderaLinkedTarget } from './tradera-listing/utils';

const TRADERA_STALE_QUEUED_LISTING_MS = 10 * 60 * 1000;
const NON_BLOCKING_LISTING_STATUSES = new Set([
  'failed',
  'auth_required',
  'ended',
  'expired',
  'unsold',
  'sold',
  'removed',
  'cancelled',
]);
const TRADERA_IN_FLIGHT_LISTING_STATUSES = new Set([
  'queued',
  'pending',
  'processing',
  'running',
  'in_progress',
]);

type TraderaCreateListingDecision =
  | { type: 'ready' }
  | { type: 'queued'; response: ProductListingCreateResponse }
  | {
      type: 'conflict';
      message: string;
      details: Record<string, unknown>;
    };

const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const getTraderaPendingExecution = (marketplaceData: unknown): Record<string, unknown> => {
  const traderaData = toRecord(toRecord(marketplaceData)['tradera']);
  return toRecord(traderaData['pendingExecution']);
};

const resolveListingUpdatedAtMs = (listing: ProductListingWithDetails): number => {
  const pendingQueuedAt = readString(
    getTraderaPendingExecution(listing.marketplaceData)['queuedAt']
  );
  const queuedAtMs = pendingQueuedAt !== null ? Date.parse(pendingQueuedAt) : Number.NaN;
  if (Number.isFinite(queuedAtMs)) {
    return queuedAtMs;
  }
  const updatedAtMs = Date.parse(listing.updatedAt ?? '');
  return Number.isFinite(updatedAtMs) ? updatedAtMs : 0;
};

const hasPendingRunId = (listing: ProductListingWithDetails): boolean =>
  readString(getTraderaPendingExecution(listing.marketplaceData)['runId']) !== null;

const isStaleTraderaQueuedListing = (
  listing: ProductListingWithDetails,
  nowMs: number
): boolean => {
  if (normalizeStatus(listing.status) !== 'queued') {
    return false;
  }
  if (hasPendingRunId(listing)) {
    return false;
  }
  const updatedAtMs = resolveListingUpdatedAtMs(listing);
  return updatedAtMs > 0 && nowMs - updatedAtMs >= TRADERA_STALE_QUEUED_LISTING_MS;
};

const buildQueuedTraderaCreateResponse = (
  listing: ProductListingWithDetails,
  enqueuedAtFallback: string
): ProductListingCreateResponse => {
  const pendingExecution = getTraderaPendingExecution(listing.marketplaceData);
  const requestId = readString(pendingExecution['requestId']);
  const queuedAt = readString(pendingExecution['queuedAt']) ?? enqueuedAtFallback;
  return {
    ...listing,
    queued: true,
    ...(requestId !== null
      ? {
          queue: {
            name: 'tradera-listings',
            jobId: requestId,
            enqueuedAt: queuedAt,
          },
        }
      : {}),
  };
};

const findLinkedTraderaListing = (
  productListings: ProductListingWithDetails[],
  connectionId: string
): ProductListingWithDetails | undefined =>
  productListings.find((listing) => {
    if (listing.connectionId !== connectionId) {
      return false;
    }

    const linkedTarget = resolvePersistedTraderaLinkedTarget({
      externalListingId: listing.externalListingId,
      marketplaceData: listing.marketplaceData,
    });
    return linkedTarget.externalListingId !== null || linkedTarget.listingUrl !== null;
  });

const buildLinkedListingConflictDecision = ({
  productId,
  connectionId,
  listing,
}: {
  productId: string;
  connectionId: string;
  listing: ProductListingWithDetails;
}): TraderaCreateListingDecision => {
  const linkedTarget = resolvePersistedTraderaLinkedTarget({
    externalListingId: listing.externalListingId,
    marketplaceData: listing.marketplaceData,
  });
  return {
    type: 'conflict',
    message: 'Product is already linked to a Tradera listing on this account',
    details: {
      productId,
      connectionId,
      listingId: listing.id,
      externalListingId: linkedTarget.externalListingId,
      listingUrl: linkedTarget.listingUrl,
    },
  };
};

const findExistingBlockingListing = (
  productListings: ProductListingWithDetails[],
  connectionId: string,
  nowMs: number
): ProductListingWithDetails | undefined =>
  productListings.find((listing) => {
    if (listing.connectionId !== connectionId) {
      return false;
    }
    const normalizedStatus = normalizeStatus(listing.status);
    if (NON_BLOCKING_LISTING_STATUSES.has(normalizedStatus)) {
      return false;
    }
    return !isStaleTraderaQueuedListing(listing, nowMs);
  });

const markStaleQueuedListingsFailed = async ({
  productListings,
  connectionId,
  listingRepository,
  nowMs,
}: {
  productListings: ProductListingWithDetails[];
  connectionId: string;
  listingRepository: ProductListingRepository;
  nowMs: number;
}): Promise<void> => {
  const staleQueuedListings = productListings.filter(
    (listing) =>
      listing.connectionId === connectionId && isStaleTraderaQueuedListing(listing, nowMs)
  );
  await Promise.all(
    staleQueuedListings.map((listing) =>
      listingRepository.updateListing(listing.id, {
        status: 'failed',
        failureReason:
          'Tradera listing queue entry expired before the browser worker started. Retry queued a fresh listing.',
      })
    )
  );
};

export const resolveTraderaCreateListingDecision = async ({
  productId,
  connectionId,
  productListings,
  listingRepository,
  now = new Date(),
}: {
  productId: string;
  connectionId: string;
  productListings: ProductListingWithDetails[];
  listingRepository: ProductListingRepository;
  now?: Date;
}): Promise<TraderaCreateListingDecision> => {
  const linkedTraderaListing = findLinkedTraderaListing(productListings, connectionId);
  if (linkedTraderaListing !== undefined) {
    return buildLinkedListingConflictDecision({
      productId,
      connectionId,
      listing: linkedTraderaListing,
    });
  }

  const nowMs = now.getTime();
  const existingBlockingListing = findExistingBlockingListing(
    productListings,
    connectionId,
    nowMs
  );

  if (
    existingBlockingListing !== undefined &&
    TRADERA_IN_FLIGHT_LISTING_STATUSES.has(normalizeStatus(existingBlockingListing.status))
  ) {
    return {
      type: 'queued',
      response: buildQueuedTraderaCreateResponse(existingBlockingListing, now.toISOString()),
    };
  }

  if (existingBlockingListing !== undefined) {
    return {
      type: 'conflict',
      message: 'Product is already listed on this account',
      details: {
        productId,
        connectionId,
        listingId: existingBlockingListing.id,
        status: existingBlockingListing.status,
      },
    };
  }

  await markStaleQueuedListingsFailed({
    productListings,
    connectionId,
    listingRepository,
    nowMs,
  });

  return { type: 'ready' };
};
