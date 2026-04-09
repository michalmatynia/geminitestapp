import type {
  PlaywrightRelistBrowserMode,
} from '@/shared/contracts/integrations/listings';

type TraderaStatusCheckListingCandidate = {
  status: string;
  listedAt?: string | null | undefined;
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

export const compareTraderaListingsForStatusCheck = <
  T extends TraderaStatusCheckListingCandidate,
>(
  left: T,
  right: T
): number => {
  const rankDiff =
    rankTraderaListingForStatusCheck(right.status) -
    rankTraderaListingForStatusCheck(left.status);
  if (rankDiff !== 0) return rankDiff;
  return (right.listedAt ?? '').localeCompare(left.listedAt ?? '');
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

export const resolvePendingTraderaExecutionAction = (
  marketplaceData: unknown
): string | null => {
  const traderaData = toRecord(toRecord(marketplaceData)['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  return normalizeStatus(readString(pendingExecution['action']));
};

export const isTraderaStatusCheckPending = <
  T extends TraderaPendingListingCandidate,
>(
  listing: T | null | undefined
): boolean => {
  const normalizedStatus = normalizeStatus(listing?.status);
  if (normalizedStatus === 'running' || normalizedStatus === 'queued') {
    return true;
  }
  return (
    resolvePendingTraderaExecutionAction(listing?.marketplaceData) ===
    'check_status'
  );
};

export const buildQueuedTraderaStatusCheckMarketplaceData = ({
  existingMarketplaceData,
  requestId,
  queuedAt,
  requestedBrowserMode = 'connection_default',
}: {
  existingMarketplaceData: unknown;
  requestId: string;
  queuedAt: string;
  requestedBrowserMode?: PlaywrightRelistBrowserMode;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  return {
    ...marketplaceData,
    marketplace: 'tradera',
    tradera: {
      ...traderaData,
      pendingExecution: {
        action: 'check_status',
        requestedBrowserMode,
        requestId,
        queuedAt,
      },
    },
  };
};
