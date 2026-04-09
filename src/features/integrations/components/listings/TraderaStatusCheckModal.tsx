'use client';

import { Activity, ExternalLink, Loader2, RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { StatusBadge } from '@/shared/ui/data-display.public';

// ─── Types ───────────────────────────────────────────────────────────────────

type RelistState = 'idle' | 'loading' | 'queued' | 'error';
type LiveCheckState = 'idle' | 'queued' | 'polling' | 'done' | 'error';

type ListingRow = {
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

function formatDate(value: string | null | undefined): string {
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
function hoursSince(value: string | null | undefined): number | null {
  if (!value) return null;
  try {
    return (Date.now() - new Date(value).getTime()) / 3_600_000;
  } catch {
    return null;
  }
}

function resolveListingUrl(listing: ProductListingWithDetails): string | null {
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

const RELIST_ELIGIBLE_STATUSES = new Set(['ended', 'unsold', 'failed', 'removed']);
const ALREADY_QUEUED_STATUSES = new Set(['queued', 'queued_relist', 'pending', 'processing', 'running']);

function statusLabel(status: string): string {
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

function statusVariant(status: string): 'active' | 'neutral' | 'error' | 'pending' | 'removed' | 'processing' | undefined {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'sold') return 'active';
  if (s === 'ended' || s === 'unsold') return 'neutral';
  if (s === 'failed') return 'error';
  if (s === 'removed') return 'removed';
  if (s === 'queued' || s === 'queued_relist' || s === 'pending') return 'pending';
  if (s === 'processing' || s === 'running') return 'processing';
  return undefined;
}

const LIVE_CHECK_POLL_INTERVAL_MS = 3_000;
const LIVE_CHECK_POLL_TIMEOUT_MS = 120_000;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StalenessWarning({ lastStatusCheckAt }: { lastStatusCheckAt: string | null | undefined }) {
  const hours = hoursSince(lastStatusCheckAt);
  if (hours === null) {
    return (
      <span className='flex items-center gap-1 text-xs text-amber-400/80'>
        <TriangleAlert className='h-3 w-3' />
        Status never checked
      </span>
    );
  }
  if (hours > 24) {
    return (
      <span className='flex items-center gap-1 text-xs text-amber-400/80'>
        <TriangleAlert className='h-3 w-3' />
        Status may be stale ({Math.floor(hours)}h ago)
      </span>
    );
  }
  return null;
}

function ListingRowView({
  row,
  onRelist,
  onLiveCheck,
}: {
  row: ListingRow;
  onRelist: (productId: string, listingId: string) => void;
  onLiveCheck: (productId: string, listingId: string) => void;
}) {
  const { productId, productName, listing, error, relistState, relistError, liveCheckState, liveCheckError } = row;
  const status = listing?.status ?? '';
  const canRelist = RELIST_ELIGIBLE_STATUSES.has(status.toLowerCase());
  const isAlreadyQueued = ALREADY_QUEUED_STATUSES.has(status.toLowerCase()) || relistState === 'queued';
  const listingUrl = listing ? resolveListingUrl(listing) : null;
  const hasListingId = !!listing?.id;
  const isLiveCheckRunning = liveCheckState === 'queued' || liveCheckState === 'polling';

  return (
    <div className='border border-border/40 rounded-lg p-4 space-y-3 bg-card/30'>
      {/* Header row: product name + status badge */}
      <div className='flex items-start justify-between gap-3'>
        <span
          className='font-medium text-sm text-foreground truncate'
          title={productName}
          style={{ maxWidth: '55%' }}
        >
          {productName}
        </span>
        <div className='flex items-center gap-2 shrink-0'>
          {listing ? (
            <StatusBadge
              status={status}
              label={statusLabel(status)}
              variant={statusVariant(status)}
              size='sm'
            />
          ) : error ? (
            <span className='flex items-center gap-1 text-xs text-destructive'>
              <TriangleAlert className='h-3.5 w-3.5' />
              Fetch error
            </span>
          ) : (
            <StatusBadge status='none' label='No listing' variant='neutral' size='sm' />
          )}
        </div>
      </div>

      {/* Fetch error detail */}
      {error && (
        <p className='text-xs text-destructive/80 break-words'>{error}</p>
      )}

      {listing && (
        <>
          {/* Metadata grid */}
          <div className='grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs'>
            <span className='text-muted-foreground'>Tradera ID</span>
            <span className='font-mono'>
              {listing.externalListingId ? (
                listingUrl ? (
                  <a
                    href={listingUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 text-primary hover:underline'
                  >
                    {listing.externalListingId}
                    <ExternalLink className='h-3 w-3' />
                  </a>
                ) : (
                  listing.externalListingId
                )
              ) : (
                <span className='text-muted-foreground'>—</span>
              )}
            </span>

            <span className='text-muted-foreground'>Connection</span>
            <span className='truncate'>{listing.connection.name}</span>

            <span className='text-muted-foreground'>Listed at</span>
            <span>{formatDate(listing.listedAt)}</span>

            <span className='text-muted-foreground'>Expires at</span>
            <span>{formatDate(listing.expiresAt)}</span>

            <span className='text-muted-foreground'>Last status check</span>
            <span className='flex flex-wrap items-center gap-2'>
              {formatDate(listing.lastStatusCheckAt)}
              <StalenessWarning lastStatusCheckAt={listing.lastStatusCheckAt} />
            </span>

            {listing.failureReason && (
              <>
                <span className='text-muted-foreground'>Failure reason</span>
                <span className='text-destructive/80 break-words'>{listing.failureReason}</span>
              </>
            )}
          </div>

          {/* Inline actions */}
          <div className='flex items-center gap-2 pt-1 flex-wrap'>
            {canRelist && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 px-2 text-xs'
                disabled={relistState === 'loading' || isAlreadyQueued}
                onClick={() => {
                  if (listing.id) onRelist(productId, listing.id);
                }}
              >
                <RotateCcw className='h-3 w-3' />
                {relistState === 'loading'
                  ? 'Relisting…'
                  : relistState === 'queued'
                    ? 'Queued'
                    : 'Relist'}
              </Button>
            )}
            {isAlreadyQueued && relistState !== 'queued' && (
              <span className='text-xs text-muted-foreground'>Already queued</span>
            )}
            {relistError && (
              <span className='text-xs text-destructive'>{relistError}</span>
            )}

            {/* Live status check button */}
            {hasListingId && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 px-2 text-xs'
                disabled={isLiveCheckRunning}
                onClick={() => {
                  if (listing.id) onLiveCheck(productId, listing.id);
                }}
              >
                {isLiveCheckRunning ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <Activity className='h-3 w-3' />
                )}
                {liveCheckState === 'queued'
                  ? 'Queuing…'
                  : liveCheckState === 'polling'
                    ? 'Checking…'
                    : liveCheckState === 'done'
                      ? 'Checked'
                      : 'Check Live'}
              </Button>
            )}
            {liveCheckError && (
              <span className='text-xs text-destructive'>{liveCheckError}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface TraderaStatusCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  products: ProductWithImages[];
}

export function TraderaStatusCheckModal(props: TraderaStatusCheckModalProps): React.JSX.Element {
  const { isOpen, onClose, productIds, products } = props;
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollDeadlinesRef = useRef<Map<string, number>>(new Map());
  const prevCheckAtRef = useRef<Map<string, string | null | undefined>>(new Map());

  const productNamesById = useMemo(
    () => new Map(products.map((p) => [p.id, p.name_en || p.name_pl || p.name_de || p.id])),
    [products]
  );

  const fetchStatuses = useCallback(async () => {
    if (productIds.length === 0) return;
    setLoading(true);

    const results = await Promise.all(
      productIds.map(async (productId): Promise<ListingRow> => {
        const productName = productNamesById.get(productId) ?? productId;
        try {
          const listings = await api.get<ProductListingWithDetails[]>(
            `/api/v2/integrations/products/${productId}/listings`
          );
          const traderaListings = Array.isArray(listings)
            ? listings.filter((l) => isTraderaIntegrationSlug(l.integration?.slug))
            : [];

          const rankStatus = (s: string): number => {
            const st = s.toLowerCase();
            if (st === 'active') return 5;
            if (st === 'sold') return 4;
            if (st === 'queued' || st === 'queued_relist' || st === 'pending' || st === 'processing' || st === 'running') return 3;
            if (st === 'ended' || st === 'unsold') return 2;
            if (st === 'failed') return 1;
            return 0;
          };
          const sorted = [...traderaListings].sort((a, b) => {
            const rankDiff = rankStatus(b.status) - rankStatus(a.status);
            if (rankDiff !== 0) return rankDiff;
            return (b.listedAt ?? '').localeCompare(a.listedAt ?? '');
          });

          return {
            productId,
            productName,
            listing: sorted[0] ?? null,
            error: null,
            relistState: 'idle',
            relistError: null,
            liveCheckState: 'idle',
            liveCheckError: null,
          };
        } catch (err) {
          return {
            productId,
            productName,
            listing: null,
            error: err instanceof Error ? err.message : 'Failed to fetch listing status.',
            relistState: 'idle',
            relistError: null,
            liveCheckState: 'idle',
            liveCheckError: null,
          };
        }
      })
    );

    setRows(results);
    setLoading(false);
  }, [productIds, productNamesById]);

  useEffect(() => {
    if (isOpen) {
      setRows([]);
      void fetchStatuses();
    }
    return () => {
      // Clear all poll timers when modal closes
      for (const timer of pollTimersRef.current.values()) {
        clearInterval(timer);
      }
      pollTimersRef.current.clear();
      pollDeadlinesRef.current.clear();
      prevCheckAtRef.current.clear();
    };
  }, [isOpen, fetchStatuses]);

  const handleRelist = useCallback(async (productId: string, listingId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId ? { ...r, relistState: 'loading', relistError: null } : r
      )
    );
    try {
      await api.post(
        `/api/v2/integrations/products/${productId}/listings/${listingId}/relist`,
        {}
      );
      setRows((prev) =>
        prev.map((r) =>
          r.productId === productId ? { ...r, relistState: 'queued', relistError: null } : r
        )
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r) =>
          r.productId === productId
            ? {
                ...r,
                relistState: 'error',
                relistError: err instanceof Error ? err.message : 'Relist failed.',
              }
            : r
        )
      );
    }
  }, []);

  const stopPolling = useCallback((productId: string) => {
    const timer = pollTimersRef.current.get(productId);
    if (timer !== undefined) {
      safeClearInterval(timer);
      pollTimersRef.current.delete(productId);
    }
    pollDeadlinesRef.current.delete(productId);
  }, []);

  const startPollingForLiveCheck = useCallback(
    (productId: string, originalCheckAt: string | null | undefined) => {
      const deadline = Date.now() + LIVE_CHECK_POLL_TIMEOUT_MS;
      pollDeadlinesRef.current.set(productId, deadline);
      prevCheckAtRef.current.set(productId, originalCheckAt);

      const timer = safeSetInterval(async () => {
        if (Date.now() > (pollDeadlinesRef.current.get(productId) ?? 0)) {
          stopPolling(productId);
          setRows((prev) =>
            prev.map((r) =>
              r.productId === productId
                ? { ...r, liveCheckState: 'error', liveCheckError: 'Timed out waiting for status check result.' }
                : r
            )
          );
          return;
        }

        try {
          const listings = await api.get<ProductListingWithDetails[]>(
            `/api/v2/integrations/products/${productId}/listings`
          );
          const traderaListings = Array.isArray(listings)
            ? listings.filter((l) => isTraderaIntegrationSlug(l.integration?.slug))
            : [];

          const rankStatus = (s: string): number => {
            const st = s.toLowerCase();
            if (st === 'active') return 5;
            if (st === 'sold') return 4;
            if (st === 'queued' || st === 'queued_relist' || st === 'pending' || st === 'processing' || st === 'running') return 3;
            if (st === 'ended' || st === 'unsold') return 2;
            if (st === 'failed') return 1;
            return 0;
          };
          const sorted = [...traderaListings].sort((a, b) => {
            const rankDiff = rankStatus(b.status) - rankStatus(a.status);
            if (rankDiff !== 0) return rankDiff;
            return (b.listedAt ?? '').localeCompare(a.listedAt ?? '');
          });
          const newListing = sorted[0] ?? null;
          const prevAt = prevCheckAtRef.current.get(productId);

          if (newListing && newListing.lastStatusCheckAt !== prevAt) {
            stopPolling(productId);
            setRows((prev) =>
              prev.map((r) =>
                r.productId === productId
                  ? { ...r, listing: newListing, liveCheckState: 'done', liveCheckError: null }
                  : r
              )
            );
          }
        } catch {
          // Keep polling on transient errors
        }
      }, LIVE_CHECK_POLL_INTERVAL_MS);

      pollTimersRef.current.set(productId, timer);
    },
    [stopPolling]
  );

  const handleLiveCheck = useCallback(
    async (productId: string, listingId: string) => {
      const row = rows.find((r) => r.productId === productId);
      const originalCheckAt = row?.listing?.lastStatusCheckAt;

      setRows((prev) =>
        prev.map((r) =>
          r.productId === productId
            ? { ...r, liveCheckState: 'queued', liveCheckError: null }
            : r
        )
      );

      try {
        await api.post(
          `/api/v2/integrations/products/${productId}/listings/${listingId}/check-status`,
          {}
        );
        setRows((prev) =>
          prev.map((r) =>
            r.productId === productId ? { ...r, liveCheckState: 'polling' } : r
          )
        );
        startPollingForLiveCheck(productId, originalCheckAt);
      } catch (err) {
        setRows((prev) =>
          prev.map((r) =>
            r.productId === productId
              ? {
                  ...r,
                  liveCheckState: 'error',
                  liveCheckError: err instanceof Error ? err.message : 'Live check failed.',
                }
              : r
          )
        );
      }
    },
    [rows, startPollingForLiveCheck]
  );

  // Summary counts
  const totalWithListing = rows.filter((r) => r.listing !== null).length;
  const activeCount = rows.filter((r) => r.listing?.status === 'active').length;
  const soldCount = rows.filter((r) => r.listing?.status === 'sold').length;
  const endedCount = rows.filter(
    (r) => r.listing?.status === 'ended' || r.listing?.status === 'unsold'
  ).length;
  const failedCount = rows.filter((r) => r.listing?.status === 'failed').length;

  const summaryParts = [
    `${totalWithListing} of ${rows.length} listed`,
    activeCount > 0 && `${activeCount} active`,
    soldCount > 0 && `${soldCount} sold`,
    endedCount > 0 && `${endedCount} ended`,
    failedCount > 0 && `${failedCount} failed`,
  ].filter(Boolean);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Tradera Listing Status'
      subtitle={
        loading && rows.length === 0
          ? `Checking ${productIds.length} product${productIds.length !== 1 ? 's' : ''}…`
          : rows.length > 0
            ? summaryParts.join(' · ')
            : `${productIds.length} product${productIds.length !== 1 ? 's' : ''} selected`
      }
      size='lg'
      headerActions={
        <Button
          variant='ghost'
          size='sm'
          onClick={() => void fetchStatuses()}
          disabled={loading}
          className='h-8 gap-1.5 px-2 text-xs'
          title='Re-fetch stored listing statuses'
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {loading && rows.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground'>
          <Loader2 className='h-6 w-6 animate-spin' />
          <span className='text-sm'>Fetching listing statuses…</span>
        </div>
      ) : (
        <div className='space-y-3'>
          {rows.map((row) => (
            <ListingRowView
              key={row.productId}
              row={row}
              onRelist={(pid, lid) => void handleRelist(pid, lid)}
              onLiveCheck={(pid, lid) => void handleLiveCheck(pid, lid)}
            />
          ))}
          {rows.length === 0 && !loading && (
            <p className='py-8 text-center text-sm text-muted-foreground'>No results.</p>
          )}
        </div>
      )}
    </AppModal>
  );
}
