import React from 'react';

import { isTraderaBrowserIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  useProductListingsActions,
  useProductListingsData,
  useProductListingsModals,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';
import { persistTraderaQuickListFeedback } from '@/features/products/components/list/columns/buttons/traderaQuickListFeedback';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations';
import { Card } from '@/shared/ui';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { renderProductListingItem } from './ProductListingItem';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readOptionalDate = (value: unknown): number | null => {
  const normalized = readOptionalString(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isTraderaRecoveryStatus = (status: string | null | undefined): boolean =>
  ['auth_required', 'failed', 'needs_login'].includes((status ?? '').trim().toLowerCase());

const resolveTraderaRecoveryRank = (listing: ProductListingWithDetails): number => {
  const normalizedStatus = (listing.status ?? '').trim().toLowerCase();
  if (normalizedStatus === 'auth_required') return 3;
  if (normalizedStatus === 'needs_login') return 2;
  if (normalizedStatus === 'failed') return 1;
  return 0;
};

const resolveTraderaExecutionMetadata = (
  listing: ProductListingWithDetails
): {
  requestId: string | null;
  runId: string | null;
  executedAt: number | null;
  updatedAt: number | null;
  createdAt: number | null;
} => {
  const traderaData = toRecord(toRecord(listing.marketplaceData)['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);

  return {
    requestId: readOptionalString(lastExecution['requestId']),
    runId: readOptionalString(metadata['runId']),
    executedAt: readOptionalDate(lastExecution['executedAt']),
    updatedAt: readOptionalDate(listing.updatedAt),
    createdAt: readOptionalDate(listing.createdAt),
  };
};

const compareTraderaRecoveryListings = (
  left: ProductListingWithDetails,
  right: ProductListingWithDetails
): number => {
  const rankDelta = resolveTraderaRecoveryRank(right) - resolveTraderaRecoveryRank(left);
  if (rankDelta !== 0) return rankDelta;

  const leftMetadata = resolveTraderaExecutionMetadata(left);
  const rightMetadata = resolveTraderaExecutionMetadata(right);
  const leftTimestamp = leftMetadata.executedAt ?? leftMetadata.updatedAt ?? leftMetadata.createdAt ?? 0;
  const rightTimestamp =
    rightMetadata.executedAt ?? rightMetadata.updatedAt ?? rightMetadata.createdAt ?? 0;
  return rightTimestamp - leftTimestamp;
};

const findTraderaRecoveryListing = (
  listings: ProductListingWithDetails[],
  recoveryRequestId: string | null,
  recoveryRunId: string | null
) =>
  (() => {
    const traderaListings = listings.filter((listing) =>
      isTraderaBrowserIntegrationSlug(listing.integration?.slug)
    );
    if (traderaListings.length === 0) return null;

    if (recoveryRequestId) {
      const requestMatch = traderaListings.find((listing) => {
        const metadata = resolveTraderaExecutionMetadata(listing);
        return metadata.requestId === recoveryRequestId;
      });
      if (requestMatch) return requestMatch;
    }

    if (recoveryRunId) {
      const runMatch = traderaListings.find((listing) => {
        const metadata = resolveTraderaExecutionMetadata(listing);
        return metadata.runId === recoveryRunId;
      });
      if (runMatch) return runMatch;
    }

    const recoveryCandidates = traderaListings
      .filter((listing) => isTraderaRecoveryStatus(listing.status))
      .sort(compareTraderaRecoveryListings);
    if (recoveryCandidates.length > 0) return recoveryCandidates[0] ?? null;

    return [...traderaListings].sort(compareTraderaRecoveryListings)[0] ?? null;
  })();

export function ProductListingsContent(): React.JSX.Element {
  const { product } = useProductListingsData();
  const { filteredListings, statusTargetLabel, filterIntegrationSlug, isBaseFilter, showSync } =
    useProductListingsViewContext();
  const { onStartListing, recoveryContext } = useProductListingsModals();
  const { handleOpenTraderaLogin } = useProductListingsActions();
  const { openingTraderaLogin } = useProductListingsUIState();
  const isTraderaQuickExportRecovery =
    recoveryContext?.source === 'tradera_quick_export_auth_required' ||
    recoveryContext?.source === 'tradera_quick_export_failed';
  const recoveryRecord =
    recoveryContext && typeof recoveryContext === 'object'
      ? (recoveryContext as Record<string, unknown>)
      : null;
  const recoveryRequestId = readOptionalString(recoveryRecord?.['requestId']);
  const recoveryRunId = readOptionalString(recoveryRecord?.['runId']);
  const fallbackRecoveryListing = isTraderaQuickExportRecovery
    ? findTraderaRecoveryListing(filteredListings, recoveryRequestId, recoveryRunId)
    : null;
  const fallbackRecoveryMetadata = fallbackRecoveryListing
    ? resolveTraderaExecutionMetadata(fallbackRecoveryListing)
    : null;
  const recoveryIntegrationId =
    readOptionalString(recoveryRecord?.['integrationId']) ??
    fallbackRecoveryListing?.integrationId ??
    null;
  const recoveryConnectionId =
    readOptionalString(recoveryRecord?.['connectionId']) ??
    fallbackRecoveryListing?.connectionId ??
    null;
  const canOpenTraderaRecoveryLogin =
    isTraderaQuickExportRecovery && Boolean(recoveryIntegrationId && recoveryConnectionId);
  const openingRecoveryLogin = openingTraderaLogin === 'recovery';

  React.useEffect(() => {
    if (!isTraderaQuickExportRecovery || !fallbackRecoveryListing) return;

    persistTraderaQuickListFeedback(product.id, 'failed', {
      runId: fallbackRecoveryMetadata?.runId ?? recoveryRunId ?? null,
      requestId: fallbackRecoveryMetadata?.requestId ?? recoveryRequestId ?? null,
      integrationId: fallbackRecoveryListing.integrationId ?? null,
      connectionId: fallbackRecoveryListing.connectionId ?? null,
    });
  }, [
    fallbackRecoveryListing,
    fallbackRecoveryMetadata?.requestId,
    fallbackRecoveryMetadata?.runId,
    isTraderaQuickExportRecovery,
    product.id,
    recoveryRequestId,
    recoveryRunId,
  ]);

  return (
    <div className='space-y-3'>
      {isTraderaQuickExportRecovery && (
        <Card variant='subtle' padding='sm' className='bg-card/60 text-xs text-gray-300'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              Tradera quick export requires recovery. Review the Tradera listing below and use
              <span className='font-semibold text-white'> Login and continue listing </span>
              if the last run needs manual verification.
              {(recoveryRequestId || recoveryRunId) && (
                <div className='mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-gray-400'>
                  {recoveryRequestId && (
                    <span>
                      Queue job: <span className='text-white'>{recoveryRequestId}</span>
                    </span>
                  )}
                  {recoveryRunId && (
                    <span>
                      Run ID: <span className='text-white'>{recoveryRunId}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            {canOpenTraderaRecoveryLogin && (
              <button
                type='button'
                className='inline-flex h-8 items-center justify-center rounded-md border border-amber-400/50 bg-amber-500/10 px-3 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={(): void => {
                  void (async (): Promise<void> => {
                    const recovered = await handleOpenTraderaLogin(
                      'recovery',
                      recoveryIntegrationId!,
                      recoveryConnectionId!
                    );
                    if (recovered) {
                      onStartListing?.(recoveryIntegrationId!, recoveryConnectionId!, {
                        autoSubmit: true,
                      });
                    }
                  })();
                }}
                disabled={openingRecoveryLogin}
              >
                {openingRecoveryLogin
                  ? 'Waiting for manual login...'
                  : 'Login and continue listing'}
              </button>
            )}
          </div>
        </Card>
      )}
      {filterIntegrationSlug && (
        <Card variant='subtle-compact' padding='sm' className='bg-card/60 text-xs text-gray-300'>
          {statusTargetLabel} status: {filteredListings[0]?.status ?? 'Unknown'}
        </Card>
      )}
      {showSync && isBaseFilter && <ProductListingsSyncPanel />}
      {filteredListings.map((listing) => (
        <React.Fragment key={listing.id}>
          {renderProductListingItem({ listing })}
        </React.Fragment>
      ))}
    </div>
  );
}
