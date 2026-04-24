'use client';

import React from 'react';
import { ExternalLink, Hint } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { JsonViewer } from '@/shared/ui/data-display.public';
import { TraderaExecutionSteps } from '@/features/integrations/components/listings/TraderaExecutionSteps';
import { 
  formatTimestamp, 
  formatTraderaDuplicateMatchStrategy,
  formatTraderaStatusVerificationSection,
  formatTraderaStatusVerificationStrategy,
  type resolveTraderaExecutionSummary,
  type resolveDisplayedTraderaDuplicateSummary,
} from '../ProductListingDetails.utils';

export function TraderaSection({
  execution,
  liveExecution,
  pendingLabel,
  duplicateSummary,
  usesCustomScript,
  listing,
}: {
  execution: ReturnType<typeof resolveTraderaExecutionSummary>;
  liveExecution: any;
  pendingLabel: string;
  duplicateSummary: ReturnType<typeof resolveDisplayedTraderaDuplicateSummary>;
  usesCustomScript: boolean;
  listing: any;
}): React.JSX.Element {
  const displayedRunId = (liveExecution?.runId ?? '') !== '' ? liveExecution.runId : execution.runId;
  const displayedLatestStage = (liveExecution?.latestStage ?? '') !== '' ? liveExecution.latestStage : execution.latestStage;
  const displayedLatestStageUrl = (liveExecution?.latestStageUrl ?? '') !== '' ? liveExecution.latestStageUrl : execution.latestStageUrl;
  const displayedExecutionSteps = (liveExecution?.executionSteps?.length ?? 0) > 0 ? liveExecution.executionSteps : execution.executionSteps;
  const displayedRawResult = liveExecution?.rawResult ?? execution.rawResult;
  const displayedLogTail = (liveExecution?.logTail?.length ?? 0) > 0 ? liveExecution.logTail : execution.logTail;
  const displayedLastAction = (liveExecution?.action ?? '') !== '' ? liveExecution.action : execution.lastAction;
  const liveStatus = liveExecution?.status === 'queued' || liveExecution?.status === 'running' ? liveExecution.status : null;

  const displayedRequestedSelectorProfile =
    liveExecution?.requestedSelectorProfile ??
    execution.requestedSelectorProfile ??
    execution.pendingSelectorProfile;
  const displayedResolvedSelectorProfile =
    liveExecution?.resolvedSelectorProfile ?? execution.resolvedSelectorProfile;

  return (
    <>
      <div className='mt-1 pt-2 border-t border-white/5 space-y-1'>
        <MetadataItem label='Expires' value={formatTimestamp(listing.expiresAt)} variant='subtle' />
        <MetadataItem label='Next relist' value={formatTimestamp(listing.nextRelistAt)} variant='subtle' />
        <MetadataItem label='Relist attempts' value={String(listing.relistAttempts ?? 0)} variant='subtle' />
        {(execution.pendingQueuedAt ?? null) !== null && (
          <MetadataItem label={pendingLabel} value={formatTimestamp(execution.pendingQueuedAt)} variant='minimal' />
        )}
        {(execution.pendingBrowserMode ?? '') !== '' && (
          <MetadataItem label='Pending browser mode' value={execution.pendingBrowserMode} variant='minimal' />
        )}
        {(execution.pendingSelectorProfile ?? '') !== '' && (
          <MetadataItem label='Pending selector profile' value={execution.pendingSelectorProfile} variant='minimal' />
        )}
        {(execution.pendingRequestId ?? '') !== '' && (
          <MetadataItem label='Pending queue job' value={execution.pendingRequestId} mono variant='minimal' />
        )}
        {(execution.executedAt ?? null) !== null && (
          <MetadataItem label='Last execution' value={formatTimestamp(execution.executedAt)} variant='minimal' />
        )}
        {(execution.lastSyncedAt ?? null) !== null && (
          <MetadataItem label='Last synced' value={formatTimestamp(execution.lastSyncedAt)} variant='minimal' />
        )}
        {(execution.mode ?? '') !== '' && (
          <MetadataItem label='Run mode' value={execution.mode} variant='minimal' />
        )}
        {(execution.browserMode ?? '') !== '' || (execution.requestedBrowserMode ?? '') !== '' ? (
          <MetadataItem label='Browser mode' value={execution.browserMode ?? execution.requestedBrowserMode} variant='minimal' />
        ) : null}
        {(displayedRequestedSelectorProfile ?? '') !== '' &&
          displayedRequestedSelectorProfile !== displayedResolvedSelectorProfile && (
            <MetadataItem
              label='Requested selector profile'
              value={displayedRequestedSelectorProfile}
              variant='minimal'
            />
        )}
        {(displayedResolvedSelectorProfile ?? displayedRequestedSelectorProfile ?? '') !== '' && (
            <MetadataItem
              label='Resolved selector profile'
              value={displayedResolvedSelectorProfile ?? displayedRequestedSelectorProfile}
              variant='minimal'
            />
        )}
        {(execution.scriptSource ?? '') !== '' && (
          <MetadataItem label='Script source' value={execution.scriptSource} variant='minimal' />
        )}
        {(execution.scriptKind ?? '') !== '' && (
          <MetadataItem label='Script type' value={execution.scriptKind} variant='minimal' />
        )}
        {(execution.scriptMarker ?? '') !== '' && (
          <MetadataItem label='Script marker' value={execution.scriptMarker} mono variant='minimal' />
        )}
        {usesCustomScript && (
          <Hint className='text-amber-300'>
            This run used a custom saved connection script. Managed Tradera fixes will not apply
            until the connection listing script is reset to the managed default.
          </Hint>
        )}
        {(execution.listingFormUrl ?? '') !== '' && (
          <MetadataItem label='Start URL' value={execution.listingFormUrl} variant='minimal' />
        )}
        {(displayedRunId ?? '') !== '' && (
          <MetadataItem label='Run ID' value={displayedRunId} mono variant='minimal' />
        )}
        {(execution.playwrightPersonaId ?? '') !== '' && (
          <MetadataItem label='Persona' value={execution.playwrightPersonaId} mono variant='minimal' />
        )}
        {(execution.requestId ?? '') !== '' && (
          <MetadataItem label='Queue job' value={execution.requestId} mono variant='minimal' />
        )}
        {execution.playwrightSlowMo !== null && (
          <MetadataItem label='SlowMo' value={`${execution.playwrightSlowMo} ms`} variant='minimal' />
        )}
        {execution.playwrightTimeout !== null || execution.playwrightNavigationTimeout !== null ? (
          <MetadataItem
            label='Timeouts'
            value={`${execution.playwrightTimeout ?? '—'} / ${execution.playwrightNavigationTimeout ?? '—'} ms`}
            variant='minimal'
          />
        ) : null}
        {execution.playwrightHumanizeMouse !== null && (
          <MetadataItem
            label='Humanized input'
            value={execution.playwrightHumanizeMouse ? 'On' : 'Off'}
            valueClassName={execution.playwrightHumanizeMouse ? 'text-emerald-400' : undefined}
            variant='minimal'
          />
        )}
        {execution.playwrightClickDelayMin !== null && execution.playwrightClickDelayMax !== null && (
          <MetadataItem
            label='Click delay'
            value={`${execution.playwrightClickDelayMin}-${execution.playwrightClickDelayMax} ms`}
            variant='minimal'
          />
        )}
        {execution.playwrightInputDelayMin !== null && execution.playwrightInputDelayMax !== null && (
          <MetadataItem
            label='Input delay'
            value={`${execution.playwrightInputDelayMin}-${execution.playwrightInputDelayMax} ms`}
            variant='minimal'
          />
        )}
        {execution.playwrightActionDelayMin !== null && execution.playwrightActionDelayMax !== null && (
          <MetadataItem
            label='Action delay'
            value={`${execution.playwrightActionDelayMin}-${execution.playwrightActionDelayMax} ms`}
            variant='minimal'
          />
        )}
        {execution.publishVerified !== null && (
          <MetadataItem
            label='Publish verified'
            value={execution.publishVerified ? 'Yes' : 'No'}
            valueClassName={execution.publishVerified ? 'text-emerald-400' : 'text-rose-400'}
            variant='minimal'
          />
        )}
        {(execution.checkedStatus ?? '') !== '' && (
          <MetadataItem label='Checked status' value={execution.checkedStatus} variant='minimal' />
        )}
        {(execution.verificationSection ?? '') !== '' && (
          <MetadataItem
            label='Verified in'
            value={formatTraderaStatusVerificationSection(execution.verificationSection)}
            variant='minimal'
          />
        )}
        {(execution.verificationMatchStrategy ?? '') !== '' && (
          <MetadataItem
            label='Match strategy'
            value={formatTraderaStatusVerificationStrategy(execution.verificationMatchStrategy)}
            variant='minimal'
          />
        )}
        {(execution.verificationRawStatusTag ?? '') !== '' && (
          <MetadataItem
            label='Tradera tag'
            value={execution.verificationRawStatusTag}
            mono
            variant='minimal'
          />
        )}
        {(execution.verificationMatchedProductId ?? '') !== '' && (
          <MetadataItem
            label='Matched Product ID'
            value={execution.verificationMatchedProductId}
            mono
            variant='minimal'
          />
        )}
        {execution.verificationCandidateCount !== null && (
          <MetadataItem
            label='Candidates inspected'
            value={String(execution.verificationCandidateCount)}
            variant='minimal'
          />
        )}
        {(displayedLatestStage ?? '') !== '' && (
          <MetadataItem label='Last stage' value={displayedLatestStage} mono variant='minimal' />
        )}
        {(displayedLatestStageUrl ?? '') !== '' && (
          <MetadataItem label='Stage URL' value={displayedLatestStageUrl} variant='minimal' />
        )}
        {(execution.categorySource ?? '') !== '' && (
          <MetadataItem label='Category source' value={execution.categorySource} variant='minimal' />
        )}
        {execution.categoryFallbackUsed && (
          <MetadataItem label='Category fallback used' value='Yes' valueClassName='text-amber-300' variant='minimal' />
        )}
        {(execution.categoryMappingReason ?? '') !== '' && (
          <MetadataItem label='Category mapping reason' value={execution.categoryMappingReason} variant='minimal' />
        )}
        {(execution.categoryMatchScope ?? '') !== '' && (
          <MetadataItem label='Category match scope' value={execution.categoryMatchScope} variant='minimal' />
        )}
        {(execution.categoryInternalCategoryId ?? '') !== '' && (
          <MetadataItem label='Internal category' value={execution.categoryInternalCategoryId} mono variant='minimal' />
        )}
        {execution.categoryMappingRecoveredFromAnotherConnection && (
          <MetadataItem label='Recovered category mapping' value='Yes' valueClassName='text-amber-300' variant='minimal' />
        )}
        {(execution.categoryMappingSourceConnectionId ?? '') !== '' && (
          <MetadataItem label='Category mapping source connection' value={execution.categoryMappingSourceConnectionId} mono variant='minimal' />
        )}
        {(execution.categoryId ?? '') !== '' && <MetadataItem label='Category ID' value={execution.categoryId} mono variant='minimal' />}
        {(execution.categoryPath ?? '') !== '' && <MetadataItem label='Category path' value={execution.categoryPath} variant='minimal' />}
        {duplicateSummary.duplicateLinked && <MetadataItem label='Existing listing linked' value='Yes' variant='minimal' />}
        {(duplicateSummary.duplicateMatchStrategy ?? '') !== '' && (
          <MetadataItem
            label='Duplicate match strategy'
            value={formatTraderaDuplicateMatchStrategy(duplicateSummary.duplicateMatchStrategy)}
            variant='minimal'
          />
        )}
        {(duplicateSummary.duplicateMatchedProductId ?? '') !== '' && (
          <MetadataItem label='Duplicate Product ID' value={duplicateSummary.duplicateMatchedProductId} mono variant='minimal' />
        )}
        {duplicateSummary.duplicateCandidateCount !== null && (
          <MetadataItem label='Duplicate title matches' value={String(duplicateSummary.duplicateCandidateCount)} variant='minimal' />
        )}
        {(duplicateSummary.duplicateSearchTitle ?? '') !== '' && (
          <MetadataItem label='Duplicate search title' value={duplicateSummary.duplicateSearchTitle} variant='minimal' />
        )}
        {duplicateSummary.duplicateIgnoredNonExactCandidateCount !== null && duplicateSummary.duplicateIgnoredNonExactCandidateCount > 0 && (
          <MetadataItem label='Ignored non-exact duplicate matches' value={String(duplicateSummary.duplicateIgnoredNonExactCandidateCount)} variant='minimal' />
        )}
        {(duplicateSummary.duplicateIgnoredCandidateTitles?.length ?? 0) > 0 && (
          <MetadataItem label='Ignored duplicate titles' value={duplicateSummary.duplicateIgnoredCandidateTitles.join(', ')} wrap variant='minimal' />
        )}
        {(execution.shippingCondition ?? '') !== '' && <MetadataItem label='Shipping condition' value={execution.shippingCondition} variant='minimal' />}
        {execution.shippingPriceEur !== null && <MetadataItem label='Shipping EUR' value={execution.shippingPriceEur.toFixed(2)} variant='minimal' />}
        {(execution.imageInputSource ?? '') !== '' && <MetadataItem label='Image input source' value={execution.imageInputSource} variant='minimal' />}
        {(execution.imageUploadSource ?? '') !== '' && <MetadataItem label='Actual image upload source' value={execution.imageUploadSource} variant='minimal' />}
        {execution.imageUploadFallbackUsed && <MetadataItem label='Image upload fallback used' value='Yes' valueClassName='text-amber-300' variant='minimal' />}
        {(execution.failureCode ?? '') !== '' && <MetadataItem label='Failure code' value={execution.failureCode} mono variant='minimal' />}
        {execution.staleDraftImages && <MetadataItem label='Stale draft images' value='Yes' valueClassName='text-amber-300' variant='minimal' />}
        {execution.duplicateRisk && <MetadataItem label='Duplicate risk' value='Yes' valueClassName='text-amber-300' variant='minimal' />}
        {execution.imageRetryCleanupUnsettled && <MetadataItem label='Retry cleanup unsettled' value='Yes' valueClassName='text-amber-300' variant='minimal' />}
        {execution.imagePreviewMismatch && <MetadataItem label='Image preview mismatch' value='Yes' valueClassName='text-amber-300' variant='minimal' />}
        {execution.expectedImageUploadCount !== null && <MetadataItem label='Expected image uploads' value={String(execution.expectedImageUploadCount)} variant='minimal' />}
        {execution.plannedImageCount !== null && <MetadataItem label='Planned image count' value={String(execution.plannedImageCount)} variant='minimal' />}
        {execution.observedImagePreviewDelta !== null && (
          <MetadataItem label='Observed new previews' value={String(execution.observedImagePreviewDelta)} variant='minimal' />
        )}
        {execution.observedImagePreviewCount !== null && (
          <MetadataItem label='Observed total previews' value={String(execution.observedImagePreviewCount)} variant='minimal' />
        )}
        {execution.localImagePathCount !== null && <MetadataItem label='Local image files' value={String(execution.localImagePathCount)} variant='minimal' />}
        {execution.imageUrlCount !== null && <MetadataItem label='Image URLs' value={String(execution.imageUrlCount)} variant='minimal' />}
        {(execution.listingUrl ?? '') !== '' && (
          <MetadataItem
            label='Listing URL'
            value={(
              <ExternalLink href={execution.listingUrl!} className='text-sky-400 hover:text-sky-300'>
                Open listing
              </ExternalLink>
            )}
            variant='minimal'
          />
        )}
        {(execution.errorCategory ?? '') !== '' && <MetadataItem label='Error category' value={execution.errorCategory} variant='minimal' />}
      </div>

      {(displayedExecutionSteps?.length ?? 0) > 0 && (
        <div className='mt-4'>
          <TraderaExecutionSteps
            title={displayedLastAction === 'check_status' ? 'Status check steps' : 'Execution steps'}
            steps={displayedExecutionSteps}
            live={liveStatus !== null}
            liveStatus={liveStatus}
          />
        </div>
      )}

      {displayedRawResult !== null && (
        <div className='mt-4'>
          <JsonViewer title='Tradera run result' data={displayedRawResult} maxHeight={220} className='bg-white/5' />
        </div>
      )}

      {(execution.failureArtifacts !== null || displayedLogTail !== null || execution.imageSettleState !== null) && (
        <div className='mt-4'>
          <JsonViewer
            title='Tradera failure diagnostics'
            data={{
              failureArtifacts: execution.failureArtifacts,
              logTail: displayedLogTail,
              imageSettleState: execution.imageSettleState,
              failureCode: execution.failureCode,
              staleDraftImages: execution.staleDraftImages,
              duplicateRisk: execution.duplicateRisk,
              imageRetryCleanupUnsettled: execution.imageRetryCleanupUnsettled,
              expectedImageUploadCount: execution.expectedImageUploadCount,
              observedImagePreviewDescriptors: execution.observedImagePreviewDescriptors,
            }}
            maxHeight={220}
            className='bg-white/5'
          />
        </div>
      )}
    </>
  );
}
