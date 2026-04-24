'use client';

import {
  Activity,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';

import { useTraderaStatusCheck } from './TraderaStatusCheckModalContext';
import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useTraderaLiveExecution } from '@/features/integrations/hooks/useTraderaLiveExecution';
import {
  isTraderaBrowserAuthRequiredMessage,
} from '@/features/integrations/utils/tradera-browser-session';
import { resolveTraderaExecutionStepsFromMarketplaceData } from '@/features/integrations/utils/tradera-execution-steps';
import { Button } from '@/shared/ui/button';
import { StatusBadge } from '@/shared/ui/data-display.public';
import {
  formatTraderaStatusVerificationSection,
  formatTraderaStatusVerificationStrategy,
  resolveTraderaExecutionSummary,
} from './product-listings-modal/listing-item/ProductListingDetails.utils';
import { TraderaExecutionSteps } from './TraderaExecutionSteps';
import {
  ALREADY_QUEUED_STATUSES,
  formatDate,
  hoursSince,
  type ListingRow,
  RELIST_ELIGIBLE_STATUSES,
  resolveDisplayedTraderaFailureReason,
  resolveListingUrl,
  resolveTraderaRowStatusPresentation,
} from './TraderaStatusCheckModal.utils';

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

export function ListingRowView({
  row,
}: {
  row: ListingRow;
}) {
  const { onRelist, onLiveCheck, onRefreshSession, refreshingSessionProductId } = useTraderaStatusCheck();
  const isRefreshingSession = refreshingSessionProductId === row.productId;
  const {
    productId,
    productName,
    listing,
    traderaExcluded,
    error,
    relistState,
    relistError,
    liveCheckState,
    liveCheckError,
  } = row;
  const listingUrl = listing ? resolveListingUrl(listing) : null;
  const hasListingId = Boolean(listing?.id);
  const supportsLiveCheck =
    hasListingId && Boolean(listing) && isTraderaBrowserIntegrationSlug(listing?.integration?.slug);
  const isLiveCheckRunning = liveCheckState === 'queued' || liveCheckState === 'polling';
  const liveTraderaExecution = useTraderaLiveExecution(supportsLiveCheck ? listing : null);
  const displayedStatus = resolveTraderaRowStatusPresentation({
    listing,
    liveRawResult: liveTraderaExecution?.rawResult,
    liveLatestStage: liveTraderaExecution?.latestStage,
  });
  const status = displayedStatus.status;
  const canRelist = RELIST_ELIGIBLE_STATUSES.has(status.toLowerCase());
  const isAlreadyQueued = ALREADY_QUEUED_STATUSES.has(status.toLowerCase()) || relistState === 'queued';
  const traderaExecution = listing
    ? resolveTraderaExecutionStepsFromMarketplaceData(listing.marketplaceData)
    : { action: null, steps: [], ok: null, error: null };
  const traderaExecutionSummary = listing
    ? resolveTraderaExecutionSummary(listing.marketplaceData)
    : null;
  const displayedTraderaAction = liveTraderaExecution?.action ?? traderaExecution.action;
  const displayedTraderaSteps =
    liveTraderaExecution && liveTraderaExecution.executionSteps.length > 0
      ? liveTraderaExecution.executionSteps
      : traderaExecution.steps;
  const displayedTraderaLiveStatus =
    liveTraderaExecution?.status === 'queued' || liveTraderaExecution?.status === 'running'
      ? liveTraderaExecution.status
      : null;
  const displayedFailureReason = resolveDisplayedTraderaFailureReason(listing, {
    liveRawResult: liveTraderaExecution?.rawResult,
    liveLatestStage: liveTraderaExecution?.latestStage,
  });
  const displayedRequestedSelectorProfile =
    liveTraderaExecution?.requestedSelectorProfile ??
    traderaExecutionSummary?.requestedSelectorProfile ??
    traderaExecutionSummary?.pendingSelectorProfile;
  const displayedResolvedSelectorProfile =
    liveTraderaExecution?.resolvedSelectorProfile ??
    traderaExecutionSummary?.resolvedSelectorProfile;
  const displayedSelectorProfile =
    displayedResolvedSelectorProfile ?? displayedRequestedSelectorProfile;
  const displayedVerificationSection =
    displayedTraderaAction === 'check_status'
      ? traderaExecutionSummary?.verificationSection ?? null
      : null;
  const displayedVerificationStrategy =
    displayedTraderaAction === 'check_status'
      ? traderaExecutionSummary?.verificationMatchStrategy ?? null
      : null;
  const displayedVerificationRawTag =
    displayedTraderaAction === 'check_status'
      ? traderaExecutionSummary?.verificationRawStatusTag ?? null
      : null;
  const displayedVerificationProductId =
    displayedTraderaAction === 'check_status'
      ? traderaExecutionSummary?.verificationMatchedProductId ?? null
      : null;
  const displayedVerificationCandidateCount =
    displayedTraderaAction === 'check_status'
      ? traderaExecutionSummary?.verificationCandidateCount ?? null
      : null;
  const requiresSessionRefresh =
    supportsLiveCheck &&
    (isTraderaBrowserAuthRequiredMessage(liveCheckError ?? displayedFailureReason) ||
      status.toLowerCase() === 'auth_required');

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
              label={displayedStatus.label}
              variant={displayedStatus.variant}
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

            {displayedSelectorProfile ? (
              <>
                <span className='text-muted-foreground'>Selector profile</span>
                <span className='truncate'>{displayedSelectorProfile}</span>
              </>
            ) : null}

            {displayedVerificationSection ? (
              <>
                <span className='text-muted-foreground'>Verified in</span>
                <span>{formatTraderaStatusVerificationSection(displayedVerificationSection)}</span>
              </>
            ) : null}

            {displayedVerificationStrategy ? (
              <>
                <span className='text-muted-foreground'>Match strategy</span>
                <span>{formatTraderaStatusVerificationStrategy(displayedVerificationStrategy)}</span>
              </>
            ) : null}

            {displayedVerificationRawTag ? (
              <>
                <span className='text-muted-foreground'>Tradera tag</span>
                <span className='font-mono break-all'>{displayedVerificationRawTag}</span>
              </>
            ) : null}

            {displayedVerificationProductId ? (
              <>
                <span className='text-muted-foreground'>Matched Product ID</span>
                <span className='font-mono break-all'>{displayedVerificationProductId}</span>
              </>
            ) : null}

            {typeof displayedVerificationCandidateCount === 'number' ? (
              <>
                <span className='text-muted-foreground'>Candidates inspected</span>
                <span>{displayedVerificationCandidateCount}</span>
              </>
            ) : null}

            {displayedRequestedSelectorProfile &&
            displayedRequestedSelectorProfile !== displayedResolvedSelectorProfile ? (
              <>
                <span className='text-muted-foreground'>Requested profile</span>
                <span className='truncate'>{displayedRequestedSelectorProfile}</span>
              </>
            ) : null}

            <span className='text-muted-foreground'>Listed at</span>
            <span>{formatDate(listing.listedAt)}</span>

            <span className='text-muted-foreground'>Expires at</span>
            <span>{formatDate(listing.expiresAt)}</span>

            <span className='text-muted-foreground'>Last status check</span>
            <span className='flex flex-wrap items-center gap-2'>
              {formatDate(listing.lastStatusCheckAt)}
              <StalenessWarning lastStatusCheckAt={listing.lastStatusCheckAt} />
            </span>

            {status.toLowerCase() === 'ended' ? (
              <>
                <span className='text-muted-foreground'>Market exclusion</span>
                <span
                  className={
                    traderaExcluded
                      ? 'inline-flex items-center gap-1 text-emerald-300'
                      : 'text-muted-foreground'
                  }
                >
                  {traderaExcluded ? <Check className='h-3 w-3' /> : null}
                  Tradera
                </span>
              </>
            ) : null}

            {displayedFailureReason && (
              <>
                <span className='text-muted-foreground'>Failure reason</span>
                <span className='text-destructive/80 break-words'>{displayedFailureReason}</span>
              </>
            )}
          </div>

          {displayedTraderaAction === 'check_status' && displayedTraderaSteps.length > 0 ? (
            <TraderaExecutionSteps
              title='Latest check steps'
              steps={displayedTraderaSteps}
              compact
              live={displayedTraderaLiveStatus !== null}
              liveStatus={displayedTraderaLiveStatus}
            />
          ) : null}

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
            {supportsLiveCheck && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 px-2 text-xs'
                disabled={isLiveCheckRunning || isRefreshingSession}
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
            {supportsLiveCheck && requiresSessionRefresh && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 border-amber-400/50 px-2 text-xs text-amber-100 hover:bg-amber-500/10 hover:text-amber-50'
                disabled={isRefreshingSession}
                onClick={() => onRefreshSession(productId)}
              >
                {isRefreshingSession ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <RefreshCw className='h-3 w-3' />
                )}
                {isRefreshingSession ? 'Waiting for login...' : 'Login to Tradera'}
              </Button>
            )}
            {hasListingId && !supportsLiveCheck && (
              <span className='text-xs text-muted-foreground'>
                Live check requires a Tradera browser listing.
              </span>
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
