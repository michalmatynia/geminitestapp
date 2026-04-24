import type {
  PlaywrightRelistBrowserMode,
} from '@/shared/contracts/integrations/listings';
import {
  resolvePendingTraderaExecutionAction,
} from '@/features/integrations/utils/tradera-listing-status';

type TraderaStatusCheckListingCandidate = {
  status: string;
  listedAt?: string | null | undefined;
  lastStatusCheckAt?: string | null | undefined;
  externalListingId?: string | null | undefined;
  marketplaceData?: unknown;
};

type TraderaPendingListingCandidate = {
  status: string;
  marketplaceData?: unknown;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const rankTraderaListingForStatusCheck = (status: string): number => {
  const normalized = normalizeStatus(status);
  if (normalized === 'active') return 5;
  if (normalized === 'sold') return 4;
  if (normalized === 'unknown') return 3;
  if (
    normalized === 'queued' ||
    normalized === 'queued_relist' ||
    normalized === 'pending' ||
    normalized === 'processing' ||
    normalized === 'running'
  ) {
    return 3;
  }
  if (normalized === 'ended' || normalized === 'unsold') return 2;
  if (normalized === 'failed') return 1;
  return 0;
};

const hasLinkedTraderaTarget = (
  candidate: Pick<TraderaStatusCheckListingCandidate, 'externalListingId' | 'marketplaceData'>
): boolean => {
  if (readString(candidate.externalListingId)) {
    return true;
  }

  const marketplaceData = toRecord(candidate.marketplaceData);
  const directListingUrl = readString(marketplaceData['listingUrl']);
  if (directListingUrl) {
    return true;
  }

  const traderaData = toRecord(marketplaceData['tradera']);
  const nestedListingUrl = readString(traderaData['listingUrl']);
  if (nestedListingUrl) {
    return true;
  }

  const lastExecution = toRecord(traderaData['lastExecution']);
  return Boolean(readString(lastExecution['listingUrl']));
};

const compareRecency = (
  left: string | null | undefined,
  right: string | null | undefined
): number => (right ?? '').localeCompare(left ?? '');

export const compareTraderaListingsForStatusCheck = <
  T extends TraderaStatusCheckListingCandidate,
>(
  left: T,
  right: T
): number => {
  const leftPending = isTraderaStatusCheckPending(left);
  const rightPending = isTraderaStatusCheckPending(right);
  if (leftPending !== rightPending) {
    return leftPending ? -1 : 1;
  }

  const rankDiff =
    rankTraderaListingForStatusCheck(right.status) -
    rankTraderaListingForStatusCheck(left.status);
  if (rankDiff !== 0) return rankDiff;

  const leftLinked = hasLinkedTraderaTarget(left);
  const rightLinked = hasLinkedTraderaTarget(right);
  if (leftLinked !== rightLinked) {
    return leftLinked ? -1 : 1;
  }

  const lastStatusCheckDiff = compareRecency(left.lastStatusCheckAt, right.lastStatusCheckAt);
  if (lastStatusCheckDiff !== 0) return lastStatusCheckDiff;

  return compareRecency(left.listedAt, right.listedAt);
};

export const selectPreferredTraderaListingForStatusCheck = <
  T extends TraderaStatusCheckListingCandidate,
>(
  listings: readonly T[]
): T | null => {
  if (listings.length === 0) return null;
  return listings.reduce((best, current) =>
    compareTraderaListingsForStatusCheck(current, best) < 0 ? current : best
  );
};

const PENDING_CHECK_STATUS_STALE_MS = 5 * 60 * 1000; // 5 min — well above the 60 s Playwright timeout

export const isTraderaStatusCheckPending = <
  T extends TraderaPendingListingCandidate,
>(
  listing: T | null | undefined
): boolean => {
  if (resolvePendingTraderaExecutionAction(listing?.marketplaceData) !== 'check_status') {
    return false;
  }
  // Treat the pending record as stale if it has been waiting longer than the max job duration.
  // This self-heals listings whose BullMQ job was lost (e.g. worker restart before processing).
  const traderaData = toRecord(toRecord(listing?.marketplaceData)['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const queuedAt = readString(pendingExecution['queuedAt']);
  if (queuedAt) {
    const ageMs = Date.now() - new Date(queuedAt).getTime();
    if (ageMs >= PENDING_CHECK_STATUS_STALE_MS) return false;
  }
  return true;
};

export const buildQueuedTraderaStatusCheckMarketplaceData = ({
  existingMarketplaceData,
  requestId,
  queuedAt,
  requestedBrowserMode = 'connection_default',
  requestedSelectorProfile,
}: {
  existingMarketplaceData: unknown;
  requestId: string;
  queuedAt: string;
  requestedBrowserMode?: PlaywrightRelistBrowserMode;
  requestedSelectorProfile?: string;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const hasRequestedSelectorProfile =
    typeof requestedSelectorProfile === 'string' &&
    requestedSelectorProfile.trim().length > 0;
  return {
    ...marketplaceData,
    marketplace: 'tradera',
    tradera: {
      ...traderaData,
      pendingExecution: {
        action: 'check_status',
        requestedBrowserMode,
        ...(hasRequestedSelectorProfile ? { requestedSelectorProfile } : {}),
        requestId,
        queuedAt,
      },
    },
  };
};
