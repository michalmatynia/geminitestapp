'use client';

import {
  isTraderaBrowserIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  isTraderaStatusCheckPending,
  selectPreferredTraderaListingForStatusCheck,
} from '@/features/integrations/utils/tradera-status-check';
import { resolveTraderaExecutionStepsFromMarketplaceData } from '@/features/integrations/utils/tradera-execution-steps';
import type {
  ProductListingWithDetails,
} from '@/shared/contracts/integrations/listings';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RelistState = 'idle' | 'loading' | 'queued' | 'error';
export type LiveCheckState = 'idle' | 'queued' | 'polling' | 'done' | 'error';

export type LiveCheckBaseline = {
  lastStatusCheckAt: string | null | undefined;
  status: string | null | undefined;
  updatedAt: string | null | undefined;
};

export type RefreshRowOptions = {
  baseline?: LiveCheckBaseline;
  preserveLiveCheckProgress?: boolean;
};

export type RefreshRowResult = {
  row: ListingRow;
  completed: boolean;
  pending: boolean;
};

export type TraderaSessionTarget = {
  productId: string;
  integrationId: string;
  connectionId: string;
};

export type ListingRow = {
  productId: string;
  productName: string;
  listing: ProductListingWithDetails | null;
  error: string | null;
  relistState: RelistState;
  relistError: string | null;
  liveCheckState: LiveCheckState;
  liveCheckError: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

/** Hours since a date string; null if date is missing. */
export function hoursSince(value: string | null | undefined): number | null {
  if (!value) return null;
  try {
    return (Date.now() - new Date(value).getTime()) / 3_600_000;
  } catch {
    return null;
  }
}

export function resolveListingUrl(listing: ProductListingWithDetails): string | null {
  const traderaData = listing.marketplaceData?.['tradera'];
  if (traderaData && typeof traderaData === 'object') {
    const data = traderaData as Record<string, unknown>;
    const lastExec = data['lastExecution'];
    if (lastExec && typeof lastExec === 'object') {
      const url = (lastExec as Record<string, unknown>)['listingUrl'];
      if (typeof url === 'string' && url.startsWith('http')) return url;
    }
    const directUrl = data['listingUrl'];
    if (typeof directUrl === 'string' && directUrl.startsWith('http')) return directUrl;
  }
  return null;
}

export function resolveDisplayedTraderaFailureReason(
  listing: ProductListingWithDetails | null | undefined
): string | null {
  if (!listing) {
    return null;
  }

  const traderaExecution = resolveTraderaExecutionStepsFromMarketplaceData(
    listing.marketplaceData
  );
  if (traderaExecution.action === 'check_status') {
    return traderaExecution.error;
  }

  return typeof listing.failureReason === 'string' && listing.failureReason.trim().length > 0
    ? listing.failureReason.trim()
    : null;
}

export function resolveTraderaSessionTarget(
  row: ListingRow | null | undefined
): TraderaSessionTarget | null {
  const listing = row?.listing;
  if (!listing || !isTraderaBrowserIntegrationSlug(listing.integration?.slug)) {
    return null;
  }
  if (!listing.integrationId || !listing.connectionId) {
    return null;
  }

  return {
    productId: row.productId,
    integrationId: listing.integrationId,
    connectionId: listing.connectionId,
  };
}

export const RELIST_ELIGIBLE_STATUSES = new Set(['ended', 'unsold', 'failed', 'removed']);
export const ALREADY_QUEUED_STATUSES = new Set(['queued', 'queued_relist', 'pending', 'processing', 'running']);

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ended: 'Ended',
    unsold: 'Unsold',
    sold: 'Sold',
    active: 'Active',
    queued: 'Queued',
    queued_relist: 'Queued relist',
    pending: 'Pending',
    processing: 'Processing',
    running: 'Running',
    failed: 'Failed',
    removed: 'Removed',
    unknown: 'Unknown',
  };
  return map[status.toLowerCase()] ?? status;
}

export function statusVariant(status: string): 'active' | 'neutral' | 'error' | 'pending' | 'removed' | 'processing' | undefined {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'sold') return 'active';
  if (s === 'ended' || s === 'unsold') return 'neutral';
  if (s === 'failed') return 'error';
  if (s === 'removed') return 'removed';
  if (s === 'queued' || s === 'queued_relist' || s === 'pending') return 'pending';
  if (s === 'processing' || s === 'running') return 'processing';
  return undefined;
}

export const LIVE_CHECK_POLL_INTERVAL_MS = 3_000;
export const LIVE_CHECK_POLL_TIMEOUT_MS = 120_000;

export function resolvePreferredTraderaListing(
  listings: ProductListingWithDetails[]
): ProductListingWithDetails | null {
  const traderaListings = Array.isArray(listings)
    ? listings.filter((listing) => isTraderaIntegrationSlug(listing.integration?.slug))
    : [];
  return selectPreferredTraderaListingForStatusCheck(traderaListings);
}

export function isListingLiveCheckPending(
  listing: ProductListingWithDetails | null | undefined
): boolean {
  return (
    !!listing &&
    isTraderaBrowserIntegrationSlug(listing.integration?.slug) &&
    isTraderaStatusCheckPending(listing)
  );
}

export function buildLiveCheckBaseline(
  listing: ProductListingWithDetails | null | undefined
): LiveCheckBaseline {
  return {
    lastStatusCheckAt: listing?.lastStatusCheckAt,
    status: listing?.status,
    updatedAt: listing?.updatedAt,
  };
}

export function hasLiveCheckCompleted(
  listing: ProductListingWithDetails | null | undefined,
  baseline: LiveCheckBaseline
): boolean {
  if (!listing) return false;
  if (listing.lastStatusCheckAt !== baseline.lastStatusCheckAt) {
    return true;
  }
  if (isListingLiveCheckPending(listing)) {
    return false;
  }
  return (
    listing.status !== baseline.status || listing.updatedAt !== baseline.updatedAt
  );
}
