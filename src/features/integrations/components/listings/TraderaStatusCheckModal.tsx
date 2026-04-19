'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Activity, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  isTraderaBrowserAuthRequiredMessage,
  refreshTraderaBrowserSession,
} from '@/features/integrations/utils/tradera-browser-session';
import { useCustomFields } from '@/features/products/hooks/useProductMetadataQueries';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';
import type {
  ProductListingWithDetails,
  TraderaListingStatusCheckBatchResponse,
} from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import {
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';
import { ensureProductMarketplaceExclusionSelection, hasProductMarketplaceExclusionSelection } from '@/shared/lib/products/utils/marketplace-exclusions';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  buildLiveCheckBaseline,
  hasLiveCheckCompleted,
  isListingLiveCheckPending,
  type ListingRow,
  LIVE_CHECK_POLL_INTERVAL_MS,
  LIVE_CHECK_POLL_TIMEOUT_MS,
  type LiveCheckBaseline,
  type RefreshRowOptions,
  type RefreshRowResult,
  resolvePreferredTraderaListing,
  resolveTraderaSessionTarget,
} from './TraderaStatusCheckModal.utils';
import { ListingRowView } from './TraderaStatusCheckModal.RowItem';
import { TraderaStatusCheckProvider } from './TraderaStatusCheckModalContext';
import { TraderaSelectorProfileOverrideSelect } from './TraderaSelectorProfileOverrideSelect';

interface TraderaStatusCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  products: ProductWithImages[];
}

export function TraderaStatusCheckModal(props: TraderaStatusCheckModalProps): React.JSX.Element {
  const { isOpen, onClose, productIds, products } = props;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const customFieldsQuery = useCustomFields({ enabled: isOpen });
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBatchChecking, setIsBatchChecking] = useState(false);
  const [selectorProfileOverride, setSelectorProfileOverride] = useState<string | null>(null);
  const [refreshingSessionProductId, setRefreshingSessionProductId] = useState<string | null>(null);
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollDeadlinesRef = useRef<Map<string, number>>(new Map());
  const liveCheckBaselinesRef = useRef<Map<string, LiveCheckBaseline>>(new Map());
  const rowsRef = useRef<ListingRow[]>([]);
  const traderaExclusionSyncInFlightRef = useRef<Set<string>>(new Set());

  const productNamesById = useMemo(
    () => new Map(products.map((p) => [p.id, p.name_en || p.name_pl || p.name_de || p.id])),
    [products]
  );
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const isProductTraderaExcluded = useCallback(
    (productId: string): boolean => {
      const product = productsById.get(productId);
      if (!product) return false;

      return hasProductMarketplaceExclusionSelection({
        customFieldDefinitions: customFieldsQuery.data,
        customFieldValues: product.customFields,
        marketplaceLabelOrAlias: 'Tradera',
      });
    },
    [customFieldsQuery.data, productsById]
  );

  const syncTraderaEndedExclusion = useCallback(
    async (row: ListingRow): Promise<void> => {
      if (row.traderaExcluded) return;
      if ((row.listing?.status ?? '').toLowerCase() !== 'ended') return;
      if (traderaExclusionSyncInFlightRef.current.has(row.productId)) return;

      const product = productsById.get(row.productId);
      if (!product) return;

      const nextSelection = ensureProductMarketplaceExclusionSelection({
        customFieldDefinitions: customFieldsQuery.data,
        customFieldValues: product.customFields,
        marketplaceLabelOrAlias: 'Tradera',
      });
      if (!nextSelection?.changed) return;

      traderaExclusionSyncInFlightRef.current.add(row.productId);
      setRows((prev) =>
        prev.map((candidate) =>
          candidate.productId === row.productId
            ? { ...candidate, traderaExcluded: true }
            : candidate
        )
      );

      try {
        await api.put(`/api/v2/products/${row.productId}`, {
          customFields: nextSelection.customFields,
        });
        await invalidateProducts(queryClient);
      } catch (error) {
        setRows((prev) =>
          prev.map((candidate) =>
            candidate.productId === row.productId
              ? { ...candidate, traderaExcluded: false }
              : candidate
          )
        );
        logClientCatch(error, {
          source: 'TraderaStatusCheckModal',
          action: 'syncTraderaEndedExclusion',
          productId: row.productId,
          level: 'warn',
        });
      } finally {
        traderaExclusionSyncInFlightRef.current.delete(row.productId);
      }
    },
    [customFieldsQuery.data, productsById, queryClient]
  );

  const buildRowFromListings = useCallback(
    (
      productId: string,
      productName: string,
      listings: ProductListingWithDetails[]
    ): ListingRow => {
      const listing = resolvePreferredTraderaListing(listings);
      const liveCheckPending = isListingLiveCheckPending(listing);
      return {
        productId,
        productName,
        listing,
        traderaExcluded: isProductTraderaExcluded(productId),
        error: null,
        relistState: 'idle',
        relistError: null,
        liveCheckState: liveCheckPending ? 'polling' : 'idle',
        liveCheckError: null,
      };
    },
    [isProductTraderaExcluded]
  );

  const fetchListingsForProduct = useCallback(
    async (productId: string): Promise<ProductListingWithDetails[]> =>
      api.get<ProductListingWithDetails[]>(
        `/api/v2/integrations/products/${productId}/listings`,
        { cache: 'no-store' }
      ),
    []
  );

  const fetchStatusRow = useCallback(
    async (productId: string): Promise<ListingRow> => {
      const productName = productNamesById.get(productId) ?? productId;
      try {
        const listings = await fetchListingsForProduct(productId);
        return buildRowFromListings(productId, productName, listings);
      } catch (err) {
        return {
          productId,
          productName,
          listing: null,
          traderaExcluded: isProductTraderaExcluded(productId),
          error: err instanceof Error ? err.message : 'Failed to fetch listing status.',
          relistState: 'idle',
          relistError: null,
          liveCheckState: 'idle',
          liveCheckError: null,
        };
      }
    },
    [buildRowFromListings, fetchListingsForProduct, isProductTraderaExcluded, productNamesById]
  );

  const fetchStatuses = useCallback(async () => {
    if (productIds.length === 0) return;
    setLoading(true);

    const results = await Promise.all(productIds.map((productId) => fetchStatusRow(productId)));

    setRows(results);
    setLoading(false);
  }, [fetchStatusRow, productIds]);

  const invalidateStatusViews = useCallback(
    (productId: string) => {
      void invalidateProductListingsAndBadges(queryClient, productId);
    },
    [queryClient]
  );

  const mergeRefreshedRow = useCallback(
    (
      currentRow: ListingRow,
      freshRow: ListingRow,
      options: RefreshRowOptions = {}
    ): ListingRow => {
      const completed = options.baseline
        ? hasLiveCheckCompleted(freshRow.listing, options.baseline)
        : false;
      const pending = isListingLiveCheckPending(freshRow.listing);
      const preserveLiveCheckProgress =
        Boolean(options.preserveLiveCheckProgress) &&
        !completed &&
        (pending ||
          currentRow.liveCheckState === 'queued' ||
          currentRow.liveCheckState === 'polling');

      return {
        ...freshRow,
        traderaExcluded: freshRow.traderaExcluded || currentRow.traderaExcluded,
        relistState: currentRow.relistState,
        relistError: currentRow.relistError,
        liveCheckState: completed
          ? 'done'
          : preserveLiveCheckProgress
            ? 'polling'
            : freshRow.liveCheckState,
        liveCheckError: completed
          ? null
          : preserveLiveCheckProgress
            ? null
            : freshRow.liveCheckError,
      };
    },
    []
  );

  const refreshRow = useCallback(
    async (
      productId: string,
      options: RefreshRowOptions = {}
    ): Promise<RefreshRowResult> => {
      const productName = productNamesById.get(productId) ?? productId;
      const listings = await fetchListingsForProduct(productId);
      const freshRow = buildRowFromListings(productId, productName, listings);
      const completed = options.baseline
        ? hasLiveCheckCompleted(freshRow.listing, options.baseline)
        : false;
      const pending = isListingLiveCheckPending(freshRow.listing);
      const currentRow = rowsRef.current.find((row) => row.productId === productId);
      const mergedRow = currentRow
        ? mergeRefreshedRow(currentRow, freshRow, options)
        : freshRow;

      setRows((prev) =>
        prev.map((row) =>
          row.productId === productId
            ? mergedRow
            : row
        )
      );

      if (options.baseline && completed && (mergedRow.listing?.status ?? '').toLowerCase() === 'ended') {
        void syncTraderaEndedExclusion(mergedRow);
      }

      return {
        row: freshRow,
        completed,
        pending,
      };
    },
    [
      buildRowFromListings,
      fetchListingsForProduct,
      mergeRefreshedRow,
      productNamesById,
      syncTraderaEndedExclusion,
    ]
  );

  useEffect(() => {
    if (isOpen) {
      setRows([]);
      setSelectorProfileOverride(null);
      void fetchStatuses();
    }
    return () => {
      // Clear all poll timers when modal closes
      for (const timer of pollTimersRef.current.values()) {
        clearInterval(timer);
      }
      pollTimersRef.current.clear();
      pollDeadlinesRef.current.clear();
      liveCheckBaselinesRef.current.clear();
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
    liveCheckBaselinesRef.current.delete(productId);
  }, []);

  const startPollingForLiveCheck = useCallback(
    (productId: string, baseline: LiveCheckBaseline) => {
      stopPolling(productId);
      const deadline = Date.now() + LIVE_CHECK_POLL_TIMEOUT_MS;
      pollDeadlinesRef.current.set(productId, deadline);
      liveCheckBaselinesRef.current.set(productId, baseline);

      const timer = safeSetInterval(() => {
        void (async () => {
          if (Date.now() > (pollDeadlinesRef.current.get(productId) ?? 0)) {
            stopPolling(productId);
            setRows((prev) =>
              prev.map((r) =>
                r.productId === productId
                  ? {
                      ...r,
                      liveCheckState: 'error',
                      liveCheckError: 'Timed out waiting for status check result.',
                    }
                  : r
              )
            );
            return;
          }

          try {
            const liveCheckBaseline = liveCheckBaselinesRef.current.get(productId) ?? baseline;
            const result = await refreshRow(productId, {
              baseline: liveCheckBaseline,
              preserveLiveCheckProgress: true,
            });

            if (result.completed) {
              stopPolling(productId);
              invalidateStatusViews(productId);
            }
          } catch {
            // Keep polling on transient errors
          }
        })();
      }, LIVE_CHECK_POLL_INTERVAL_MS);

      pollTimersRef.current.set(productId, timer);
    },
    [invalidateStatusViews, refreshRow, stopPolling]
  );

  useEffect(() => {
    rows.forEach((row) => {
      if (
        row.listing &&
        row.liveCheckState === 'polling' &&
        !pollTimersRef.current.has(row.productId)
      ) {
        startPollingForLiveCheck(row.productId, buildLiveCheckBaseline(row.listing));
      }
    });
  }, [rows, startPollingForLiveCheck]);

  const handleRefreshSession = useCallback(
    async (productId: string) => {
      const row = rows.find((candidate) => candidate.productId === productId);
      const target = resolveTraderaSessionTarget(row);
      if (!target) {
        toast('Tradera browser connection not available for session refresh.', {
          variant: 'error',
        });
        return;
      }

      try {
        setRefreshingSessionProductId(productId);
        setRows((prev) =>
          prev.map((candidate) =>
            candidate.productId === productId
              ? { ...candidate, liveCheckError: null }
              : candidate
          )
        );

        const response = await refreshTraderaBrowserSession({
          integrationId: target.integrationId,
          connectionId: target.connectionId,
        });
        toast(
          response.savedSession
            ? 'Tradera login session refreshed.'
            : 'Tradera manual login completed.',
          { variant: 'success' }
        );

        setRows((prev) =>
          prev.map((candidate) =>
            candidate.productId === productId
              ? { ...candidate, liveCheckState: 'idle', liveCheckError: null }
              : candidate
          )
        );
        invalidateStatusViews(productId);
        await refreshRow(productId).catch(() => undefined);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to refresh the Tradera browser session.';
        setRows((prev) =>
          prev.map((candidate) =>
            candidate.productId === productId
              ? {
                  ...candidate,
                  liveCheckState: 'error',
                  liveCheckError: message,
                }
              : candidate
          )
        );
        toast(message, {
          variant: isTraderaBrowserAuthRequiredMessage(message) ? 'warning' : 'error',
        });
      } finally {
        setRefreshingSessionProductId(null);
      }
    },
    [invalidateStatusViews, refreshRow, rows, toast]
  );

  const handleLiveCheck = useCallback(
    async (productId: string, listingId: string) => {
      const row = rows.find((r) => r.productId === productId);
      const baseline = buildLiveCheckBaseline(row?.listing);
      const requestedSelectorProfile =
        typeof selectorProfileOverride === 'string' ? selectorProfileOverride.trim() : '';

      setRows((prev) =>
        prev.map((r) =>
          r.productId === productId
            ? { ...r, liveCheckState: 'queued', liveCheckError: null }
            : r
        )
      );

      try {
        const requestBody =
          requestedSelectorProfile.length > 0
            ? { selectorProfile: requestedSelectorProfile }
            : {};
        await api.post(
          `/api/v2/integrations/products/${productId}/listings/${listingId}/check-status`,
          requestBody
        );
        setRows((prev) =>
          prev.map((r) =>
            r.productId === productId ? { ...r, liveCheckState: 'polling' } : r
          )
        );
        invalidateStatusViews(productId);
        try {
          const result = await refreshRow(productId, {
            baseline,
            preserveLiveCheckProgress: true,
          });
          if (!result.completed) {
            startPollingForLiveCheck(productId, baseline);
          }
        } catch {
          startPollingForLiveCheck(productId, baseline);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Live check failed.';
        const authRequired = isTraderaBrowserAuthRequiredMessage(message);
        setRows((prev) =>
          prev.map((r) =>
            r.productId === productId
              ? {
                  ...r,
                  liveCheckState: authRequired ? 'idle' : 'error',
                  liveCheckError: message,
                }
              : r
          )
        );
      }
    },
    [invalidateStatusViews, refreshRow, rows, selectorProfileOverride, startPollingForLiveCheck]
  );

  const handleCheckAllLive = useCallback(async () => {
    const eligibleRows = rows.filter(
      (row) =>
        row.listing &&
        isTraderaBrowserIntegrationSlug(row.listing.integration?.slug)
    );
    if (eligibleRows.length === 0) {
      toast('No Tradera browser listings are available for live checks.', {
        variant: 'warning',
      });
      return;
    }

    const eligibleProductIds = eligibleRows.map((row) => row.productId);
    const eligibleProductIdSet = new Set(eligibleProductIds);
    const baselineByProductId = new Map(
      eligibleRows.map((row) => [row.productId, buildLiveCheckBaseline(row.listing)])
    );
    const requestedSelectorProfile =
      typeof selectorProfileOverride === 'string' ? selectorProfileOverride.trim() : '';
    const requestBody = {
      productIds: eligibleProductIds,
      ...(requestedSelectorProfile.length > 0
        ? { selectorProfile: requestedSelectorProfile }
        : {}),
    };
    setIsBatchChecking(true);
    setRows((prev) =>
      prev.map((row) =>
        eligibleProductIdSet.has(row.productId)
          ? { ...row, liveCheckState: 'idle', liveCheckError: null }
          : row
      )
    );

    try {
      setRows((prev) =>
        prev.map((row) =>
          eligibleProductIdSet.has(row.productId)
            ? { ...row, liveCheckState: 'queued', liveCheckError: null }
            : row
        )
      );

      const response = await api.post<TraderaListingStatusCheckBatchResponse>(
        '/api/v2/integrations/product-listings/tradera-status-check',
        requestBody
      );
      const resultByProductId = new Map(
        response.results.map((result) => [result.productId, result])
      );

      setRows((prev) =>
        prev.map((row) => {
          const result = resultByProductId.get(row.productId);
          if (!result) return row;
          if (result.status === 'queued' || result.status === 'already_queued') {
            return { ...row, liveCheckState: 'polling', liveCheckError: null };
          }
          if (result.status === 'skipped') {
            return {
              ...row,
              liveCheckState: 'idle',
              liveCheckError:
                result.message ??
                'No Tradera browser listing available for live status check.',
            };
          }
          const authRequired = isTraderaBrowserAuthRequiredMessage(result.message);
          return {
            ...row,
            liveCheckState: authRequired ? 'idle' : 'error',
            liveCheckError: result.message ?? 'Live check failed.',
          };
        })
      );

      await Promise.all(
        response.results.map(async (result) => {
          if (result.status !== 'queued' && result.status !== 'already_queued') {
            return;
          }
          invalidateStatusViews(result.productId);
          const baseline = baselineByProductId.get(result.productId) ?? {
            lastStatusCheckAt: null,
            status: null,
            updatedAt: null,
          };
          try {
            const refreshResult = await refreshRow(result.productId, {
              baseline,
              preserveLiveCheckProgress: true,
            });
            if (!refreshResult.completed) {
              startPollingForLiveCheck(result.productId, baseline);
            }
          } catch {
            startPollingForLiveCheck(result.productId, baseline);
          }
        })
      );

      const summaryParts = [
        response.queued > 0 && `${response.queued} queued`,
        response.alreadyQueued > 0 && `${response.alreadyQueued} already queued`,
        response.skipped > 0 && `${response.skipped} skipped`,
        response.results.filter((result) => isTraderaBrowserAuthRequiredMessage(result.message)).length > 0 &&
          `${response.results.filter((result) => isTraderaBrowserAuthRequiredMessage(result.message)).length} need login`,
        response.results.filter((result) => result.status === 'error' && !isTraderaBrowserAuthRequiredMessage(result.message)).length > 0 &&
          `${response.results.filter((result) => result.status === 'error' && !isTraderaBrowserAuthRequiredMessage(result.message)).length} failed`,
      ].filter(Boolean);

      toast(
        summaryParts.length > 0
          ? `Tradera live checks: ${summaryParts.join(', ')}.`
          : 'No Tradera browser listings were eligible for live check.',
        {
          variant:
            response.failed > 0 ? 'warning' : 'success',
        }
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to queue live status checks.';
      setRows((prev) =>
        prev.map((row) =>
          eligibleProductIdSet.has(row.productId)
            ? {
                ...row,
                liveCheckState: 'error',
                liveCheckError: message,
              }
            : row
        )
      );
      toast(message, { variant: 'error' });
    } finally {
      setIsBatchChecking(false);
    }
  }, [invalidateStatusViews, refreshRow, rows, selectorProfileOverride, startPollingForLiveCheck, toast]);

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
  const liveCheckEligibleCount = rows.filter(
    (row) =>
      row.listing &&
      isTraderaBrowserIntegrationSlug(row.listing.integration?.slug)
  ).length;

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
        <div className='flex flex-wrap items-center gap-2'>
          <TraderaSelectorProfileOverrideSelect
            value={selectorProfileOverride}
            onChange={setSelectorProfileOverride}
            ariaLabel='Selector profile override'
            title='Choose a Mongo-backed Tradera selector profile, or leave configured profile selected.'
            configuredLabel='Configured profile'
            className='w-40'
            disabled={loading || isBatchChecking}
          />
          <Button
            variant='outline'
            size='sm'
            onClick={() => void handleCheckAllLive()}
            disabled={loading || isBatchChecking || liveCheckEligibleCount === 0}
            className='h-8 gap-1.5 px-2 text-xs'
            title='Queue live status checks for all eligible Tradera browser listings'
          >
            {isBatchChecking ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Activity className='h-3.5 w-3.5' />
            )}
            {isBatchChecking ? 'Queuing All…' : 'Check All Live'}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => void fetchStatuses()}
            disabled={loading || isBatchChecking}
            className='h-8 gap-1.5 px-2 text-xs'
            title='Re-fetch stored listing statuses'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      {loading && rows.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground'>
          <Loader2 className='h-6 w-6 animate-spin' />
          <span className='text-sm'>Fetching listing statuses…</span>
        </div>
      ) : (
        <TraderaStatusCheckProvider
          value={{
            onRelist: (pid, lid) => void handleRelist(pid, lid),
            onLiveCheck: (pid, lid) => void handleLiveCheck(pid, lid),
            onRefreshSession: (productId) => void handleRefreshSession(productId),
            refreshingSessionProductId,
          }}
        >
          <div className='space-y-3'>
            {rows.map((row) => (
              <ListingRowView key={row.productId} row={row} />
            ))}
            {rows.length === 0 && !loading && (
              <p className='py-8 text-center text-sm text-muted-foreground'>No results.</p>
            )}
          </div>
        </TraderaStatusCheckProvider>
      )}
    </AppModal>
  );
}
