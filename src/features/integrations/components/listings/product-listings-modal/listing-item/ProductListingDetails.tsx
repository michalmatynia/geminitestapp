'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

import {
  PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
  TRADERA_INTEGRATION_SLUGS,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useProductListingsData,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';
import type {
  ProductListingExportEvent,
} from '@/shared/contracts/integrations/listings';
import { StatusBadge, JsonViewer } from '@/shared/ui/data-display.public';
import { Card, Button } from '@/shared/ui/primitives.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { Hint, ExternalLink } from '@/shared/ui/forms-and-actions.public';
import { TraderaExecutionSteps } from '@/features/integrations/components/listings/TraderaExecutionSteps';

import { resolveIntegrationDisplayName } from '../../product-listings-labels';
import type { ProductListingWithDetailsProps } from './types';
import {
  formatTimestamp,
  formatListValue,
  formatTraderaDuplicateMatchStrategy,
  normalizeIntegrationSlug,
  resolveTraderaStatusBadge,
  resolveHistoryBrowserMode,
  resolveDisplayHistoryFields,
  resolveTraderaExecutionSummary,
  resolvePlaywrightExecutionSummary,
  resolveVintedExecutionSummary,
} from './ProductListingDetails.utils';

type ProductListingDetailsProps = ProductListingWithDetailsProps;

export function ProductListingDetails(props: ProductListingDetailsProps): React.JSX.Element {
  const { listing } = props;
  const { product } = useProductListingsData();
  const { historyOpenByListing, setHistoryOpenByListing } = useProductListingsUIState();

  const isBaseListing = ['baselinker', 'base-com', 'base'].includes(
    normalizeIntegrationSlug(listing.integration.slug)
  );
  const isTraderaListing = TRADERA_INTEGRATION_SLUGS.has(
    normalizeIntegrationSlug(listing.integration.slug)
  );
  const isVintedListing = isVintedIntegrationSlug(listing.integration.slug);
  const isPlaywrightListing =
    normalizeIntegrationSlug(listing.integration.slug) === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG;
  const traderaExecution = resolveTraderaExecutionSummary(listing.marketplaceData);
  const vintedExecution = resolveVintedExecutionSummary(listing.marketplaceData);
  const playwrightExecution = resolvePlaywrightExecutionSummary(listing.marketplaceData);
  const traderaUsesCustomConnectionScript =
    isTraderaListing &&
    traderaExecution.scriptSource === 'connection' &&
    traderaExecution.scriptKind === 'custom';
  const traderaStatusBadge = isTraderaListing
    ? resolveTraderaStatusBadge(listing.status, traderaExecution.duplicateLinked)
    : null;

  const getExportFieldsLabel = (): string => {
    const fields: string[] = [];
    if (product.sku) fields.push('SKU');
    if (product.ean) fields.push('EAN');
    if (product.weight !== null && product.weight !== undefined) fields.push('Weight');
    if (product.name_en) fields.push('Name');
    if (product.description_en) fields.push('Description');
    if (product.price !== null && product.price !== undefined) fields.push('Price');
    if (product.stock !== null && product.stock !== undefined) fields.push('Stock');
    return fields.length > 0 ? fields.join(', ') : 'No exportable fields detected';
  };

  const isHistoryOpen = historyOpenByListing[listing.id] ?? false;
  const integrationDisplayName =
    resolveIntegrationDisplayName(listing.integration.name, listing.integration.slug) ??
    listing.integration.name;

  return (
    <div className='flex-1 min-w-0'>
      <div className='flex items-center gap-2 mb-2'>
        <span className='font-semibold text-white truncate'>{integrationDisplayName}</span>
        <StatusBadge
          status={traderaStatusBadge?.status ?? listing.status}
          label={traderaStatusBadge?.label}
        />
      </div>

      <div className='grid gap-y-1.5'>
        <MetadataItem label='Account' value={listing.connection.name} variant='minimal' />
        {listing.externalListingId && (
          <MetadataItem
            label='External ID'
            value={listing.externalListingId}
            mono
            variant='minimal'
          />
        )}
        {listing.inventoryId && (
          <MetadataItem label='Inventory ID' value={listing.inventoryId} mono variant='minimal' />
        )}

        <div className='mt-1 pt-2 border-t border-white/5 space-y-1'>
          <MetadataItem
            label='Last export'
            value={formatTimestamp(listing.listedAt)}
            variant='subtle'
          />
          {isTraderaListing && (
            <>
              <MetadataItem
                label='Expires'
                value={formatTimestamp(listing.expiresAt)}
                variant='subtle'
              />
              <MetadataItem
                label='Next relist'
                value={formatTimestamp(listing.nextRelistAt)}
                variant='subtle'
              />
              <MetadataItem
                label='Relist attempts'
                value={String(listing.relistAttempts ?? 0)}
                variant='subtle'
              />
            </>
          )}
          <MetadataItem
            label='Created'
            value={formatTimestamp(listing.createdAt)}
            variant='subtle'
          />
          {listing.failureReason ? (
            <MetadataItem
              label='Failure'
              value={listing.failureReason}
              wrap
              valueClassName='text-red-400 font-medium'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.pendingQueuedAt ? (
            <MetadataItem
              label='Pending relist'
              value={formatTimestamp(traderaExecution.pendingQueuedAt)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.pendingBrowserMode ? (
            <MetadataItem
              label='Pending browser mode'
              value={traderaExecution.pendingBrowserMode}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.pendingRequestId ? (
            <MetadataItem
              label='Pending queue job'
              value={traderaExecution.pendingRequestId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.executedAt ? (
            <MetadataItem
              label='Last execution'
              value={formatTimestamp(traderaExecution.executedAt)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.lastSyncedAt ? (
            <MetadataItem
              label='Last synced'
              value={formatTimestamp(traderaExecution.lastSyncedAt)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.mode ? (
            <MetadataItem
              label='Run mode'
              value={traderaExecution.mode}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && (traderaExecution.browserMode || traderaExecution.requestedBrowserMode) ? (
            <MetadataItem
              label='Browser mode'
              value={traderaExecution.browserMode ?? traderaExecution.requestedBrowserMode}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.scriptSource ? (
            <MetadataItem
              label='Script source'
              value={traderaExecution.scriptSource}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.scriptKind ? (
            <MetadataItem
              label='Script type'
              value={traderaExecution.scriptKind}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.scriptMarker ? (
            <MetadataItem
              label='Script marker'
              value={traderaExecution.scriptMarker}
              mono
              variant='minimal'
            />
          ) : null}
          {traderaUsesCustomConnectionScript ? (
            <Hint className='text-amber-300'>
              This run used a custom saved connection script. Managed Tradera fixes will not apply
              until the connection listing script is reset to the managed default.
            </Hint>
          ) : null}
          {isTraderaListing && traderaExecution.listingFormUrl ? (
            <MetadataItem
              label='Start URL'
              value={traderaExecution.listingFormUrl}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.runId ? (
            <MetadataItem
              label='Run ID'
              value={traderaExecution.runId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.playwrightPersonaId ? (
            <MetadataItem
              label='Persona'
              value={traderaExecution.playwrightPersonaId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.requestId ? (
            <MetadataItem
              label='Queue job'
              value={traderaExecution.requestId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.playwrightSlowMo !== null ? (
            <MetadataItem
              label='SlowMo'
              value={`${traderaExecution.playwrightSlowMo} ms`}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing &&
          (traderaExecution.playwrightTimeout !== null ||
            traderaExecution.playwrightNavigationTimeout !== null) ? (
            <MetadataItem
              label='Timeouts'
              value={`${traderaExecution.playwrightTimeout ?? '—'} / ${traderaExecution.playwrightNavigationTimeout ?? '—'} ms`}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.playwrightHumanizeMouse !== null ? (
            <MetadataItem
              label='Humanized input'
              value={traderaExecution.playwrightHumanizeMouse ? 'On' : 'Off'}
              valueClassName={
                traderaExecution.playwrightHumanizeMouse ? 'text-emerald-400' : undefined
              }
              variant='minimal'
            />
          ) : null}
          {isTraderaListing &&
          traderaExecution.playwrightClickDelayMin !== null &&
          traderaExecution.playwrightClickDelayMax !== null ? (
            <MetadataItem
              label='Click delay'
              value={`${traderaExecution.playwrightClickDelayMin}-${traderaExecution.playwrightClickDelayMax} ms`}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing &&
          traderaExecution.playwrightInputDelayMin !== null &&
          traderaExecution.playwrightInputDelayMax !== null ? (
            <MetadataItem
              label='Input delay'
              value={`${traderaExecution.playwrightInputDelayMin}-${traderaExecution.playwrightInputDelayMax} ms`}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing &&
          traderaExecution.playwrightActionDelayMin !== null &&
          traderaExecution.playwrightActionDelayMax !== null ? (
            <MetadataItem
              label='Action delay'
              value={`${traderaExecution.playwrightActionDelayMin}-${traderaExecution.playwrightActionDelayMax} ms`}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.publishVerified !== null ? (
            <MetadataItem
              label='Publish verified'
              value={traderaExecution.publishVerified ? 'Yes' : 'No'}
              valueClassName={traderaExecution.publishVerified ? 'text-emerald-400' : 'text-rose-400'}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.latestStage ? (
            <MetadataItem
              label='Last stage'
              value={traderaExecution.latestStage}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.latestStageUrl ? (
            <MetadataItem
              label='Stage URL'
              value={traderaExecution.latestStageUrl}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categorySource ? (
            <MetadataItem
              label='Category source'
              value={traderaExecution.categorySource}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryFallbackUsed ? (
            <MetadataItem
              label='Category fallback used'
              value='Yes'
              valueClassName='text-amber-300'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryMappingReason ? (
            <MetadataItem
              label='Category mapping reason'
              value={traderaExecution.categoryMappingReason}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryMatchScope ? (
            <MetadataItem
              label='Category match scope'
              value={traderaExecution.categoryMatchScope}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryInternalCategoryId ? (
            <MetadataItem
              label='Internal category'
              value={traderaExecution.categoryInternalCategoryId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryMappingRecoveredFromAnotherConnection ? (
            <MetadataItem
              label='Recovered category mapping'
              value='Yes'
              valueClassName='text-amber-300'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryMappingSourceConnectionId ? (
            <MetadataItem
              label='Category mapping source connection'
              value={traderaExecution.categoryMappingSourceConnectionId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryId ? (
            <MetadataItem
              label='Category ID'
              value={traderaExecution.categoryId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.categoryPath ? (
            <MetadataItem
              label='Category path'
              value={traderaExecution.categoryPath}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.duplicateLinked ? (
            <MetadataItem
              label='Existing listing linked'
              value='Yes'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.duplicateMatchStrategy ? (
            <MetadataItem
              label='Duplicate match strategy'
              value={formatTraderaDuplicateMatchStrategy(traderaExecution.duplicateMatchStrategy)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.duplicateMatchedProductId ? (
            <MetadataItem
              label='Duplicate Product ID'
              value={traderaExecution.duplicateMatchedProductId}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.duplicateCandidateCount !== null ? (
            <MetadataItem
              label='Duplicate title matches'
              value={String(traderaExecution.duplicateCandidateCount)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.duplicateSearchTitle ? (
            <MetadataItem
              label='Duplicate search title'
              value={traderaExecution.duplicateSearchTitle}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.shippingCondition ? (
            <MetadataItem
              label='Shipping condition'
              value={traderaExecution.shippingCondition}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.shippingPriceEur !== null ? (
            <MetadataItem
              label='Shipping EUR'
              value={traderaExecution.shippingPriceEur.toFixed(2)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.imageInputSource ? (
            <MetadataItem
              label='Image input source'
              value={traderaExecution.imageInputSource}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.imageUploadSource ? (
            <MetadataItem
              label='Actual image upload source'
              value={traderaExecution.imageUploadSource}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.imageUploadFallbackUsed ? (
            <MetadataItem
              label='Image upload fallback used'
              value='Yes'
              valueClassName='text-amber-300'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.failureCode ? (
            <MetadataItem
              label='Failure code'
              value={traderaExecution.failureCode}
              mono
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.duplicateRisk ? (
            <MetadataItem
              label='Duplicate risk'
              value='Yes'
              valueClassName='text-amber-300'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.imageRetryCleanupUnsettled ? (
            <MetadataItem
              label='Retry cleanup unsettled'
              value='Yes'
              valueClassName='text-amber-300'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.imagePreviewMismatch ? (
            <MetadataItem
              label='Image preview mismatch'
              value='Yes'
              valueClassName='text-amber-300'
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.expectedImageUploadCount !== null ? (
            <MetadataItem
              label='Expected image uploads'
              value={String(traderaExecution.expectedImageUploadCount)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.plannedImageCount !== null ? (
            <MetadataItem
              label='Planned image count'
              value={String(traderaExecution.plannedImageCount)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.observedImagePreviewDelta !== null ? (
            <MetadataItem
              label='Observed new previews'
              value={String(traderaExecution.observedImagePreviewDelta)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.observedImagePreviewCount !== null ? (
            <MetadataItem
              label='Observed total previews'
              value={String(traderaExecution.observedImagePreviewCount)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.localImagePathCount !== null ? (
            <MetadataItem
              label='Local image files'
              value={String(traderaExecution.localImagePathCount)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.imageUrlCount !== null ? (
            <MetadataItem
              label='Image URLs'
              value={String(traderaExecution.imageUrlCount)}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.listingUrl ? (
            <MetadataItem
              label='Listing URL'
              value={(
                <ExternalLink href={traderaExecution.listingUrl} className='text-sky-400 hover:text-sky-300'>
                  Open listing
                </ExternalLink>
              )}
              variant='minimal'
            />
          ) : null}
          {isTraderaListing && traderaExecution.errorCategory ? (
            <MetadataItem
              label='Error category'
              value={traderaExecution.errorCategory}
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.executedAt ? (
            <MetadataItem
              label='Last execution'
              value={formatTimestamp(playwrightExecution.executedAt)}
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.pendingQueuedAt ? (
            <MetadataItem
              label='Pending execution'
              value={formatTimestamp(vintedExecution.pendingQueuedAt)}
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.pendingBrowserMode ? (
            <MetadataItem
              label='Pending browser mode'
              value={vintedExecution.pendingBrowserMode}
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.pendingBrowserPreference ? (
            <MetadataItem
              label='Pending browser'
              value={vintedExecution.pendingBrowserPreference}
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.pendingRequestId ? (
            <MetadataItem
              label='Pending queue job'
              value={vintedExecution.pendingRequestId}
              mono
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.executedAt ? (
            <MetadataItem
              label='Last execution'
              value={formatTimestamp(vintedExecution.executedAt)}
              variant='minimal'
            />
          ) : null}
          {isVintedListing && (vintedExecution.browserMode || vintedExecution.requestedBrowserMode) ? (
            <MetadataItem
              label='Browser mode'
              value={vintedExecution.browserMode ?? vintedExecution.requestedBrowserMode}
              variant='minimal'
            />
          ) : null}
          {isVintedListing &&
          (vintedExecution.browserLabel ||
            vintedExecution.browserPreference ||
            vintedExecution.requestedBrowserPreference) ? (
            <MetadataItem
              label='Browser'
              value={
                vintedExecution.browserLabel ??
                vintedExecution.browserPreference ??
                vintedExecution.requestedBrowserPreference
              }
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.requestId ? (
            <MetadataItem
              label='Queue job'
              value={vintedExecution.requestId}
              mono
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.publishVerified !== null ? (
            <MetadataItem
              label='Publish verified'
              value={vintedExecution.publishVerified ? 'Yes' : 'No'}
              valueClassName={vintedExecution.publishVerified ? 'text-emerald-400' : 'text-rose-400'}
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.listingUrl ? (
            <MetadataItem
              label='Listing URL'
              value={(
                <ExternalLink href={vintedExecution.listingUrl} className='text-sky-400 hover:text-sky-300'>
                  Open listing
                </ExternalLink>
              )}
              variant='minimal'
            />
          ) : null}
          {isVintedListing && vintedExecution.errorCategory ? (
            <MetadataItem
              label='Error category'
              value={vintedExecution.errorCategory}
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.pendingQueuedAt ? (
            <MetadataItem
              label='Pending relist'
              value={formatTimestamp(playwrightExecution.pendingQueuedAt)}
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.pendingBrowserMode ? (
            <MetadataItem
              label='Pending browser mode'
              value={playwrightExecution.pendingBrowserMode}
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.pendingRequestId ? (
            <MetadataItem
              label='Pending queue job'
              value={playwrightExecution.pendingRequestId}
              mono
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && (playwrightExecution.browserMode || playwrightExecution.requestedBrowserMode) ? (
            <MetadataItem
              label='Browser mode'
              value={playwrightExecution.browserMode ?? playwrightExecution.requestedBrowserMode}
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.runId ? (
            <MetadataItem
              label='Run ID'
              value={playwrightExecution.runId}
              mono
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.requestId ? (
            <MetadataItem
              label='Queue job'
              value={playwrightExecution.requestId}
              mono
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.publishVerified !== null ? (
            <MetadataItem
              label='Publish verified'
              value={playwrightExecution.publishVerified ? 'Yes' : 'No'}
              valueClassName={playwrightExecution.publishVerified ? 'text-emerald-400' : 'text-rose-400'}
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.listingUrl ? (
            <MetadataItem
              label='Listing URL'
              value={(
                <ExternalLink href={playwrightExecution.listingUrl} className='text-sky-400 hover:text-sky-300'>
                  Open listing
                </ExternalLink>
              )}
              variant='minimal'
            />
          ) : null}
          {isPlaywrightListing && playwrightExecution.errorCategory ? (
            <MetadataItem
              label='Error category'
              value={playwrightExecution.errorCategory}
              variant='minimal'
            />
          ) : null}
          {isBaseListing && (
            <MetadataItem label='Exported fields' value={getExportFieldsLabel()} variant='subtle' />
          )}
        </div>
      </div>

      {isTraderaListing && traderaExecution.executionSteps.length > 0 ? (
        <div className='mt-4'>
          <TraderaExecutionSteps
            title={
              traderaExecution.lastAction === 'check_status'
                ? 'Status check steps'
                : 'Execution steps'
            }
            steps={traderaExecution.executionSteps}
          />
        </div>
      ) : null}

      {isTraderaListing && traderaExecution.rawResult ? (
        <div className='mt-4'>
          <JsonViewer
            title='Tradera run result'
            data={traderaExecution.rawResult}
            maxHeight={220}
            className='bg-white/5'
          />
        </div>
      ) : null}
      {isTraderaListing &&
      (traderaExecution.failureArtifacts ||
        traderaExecution.logTail ||
        traderaExecution.imageSettleState) ? (
        <div className='mt-4'>
          <JsonViewer
            title='Tradera failure diagnostics'
            data={{
              failureArtifacts: traderaExecution.failureArtifacts,
              logTail: traderaExecution.logTail,
              imageSettleState: traderaExecution.imageSettleState,
              failureCode: traderaExecution.failureCode,
              duplicateRisk: traderaExecution.duplicateRisk,
              imageRetryCleanupUnsettled: traderaExecution.imageRetryCleanupUnsettled,
              expectedImageUploadCount: traderaExecution.expectedImageUploadCount,
              observedImagePreviewDescriptors: traderaExecution.observedImagePreviewDescriptors,
            }}
            maxHeight={220}
            className='bg-white/5'
          />
        </div>
      ) : null}
      {isPlaywrightListing && playwrightExecution.rawResult ? (
        <div className='mt-4'>
          <JsonViewer
            title='Playwright run result'
            data={playwrightExecution.rawResult}
            maxHeight={220}
            className='bg-white/5'
          />
        </div>
      ) : null}
      {isVintedListing && vintedExecution.rawResult ? (
        <div className='mt-4'>
          <JsonViewer
            title='Vinted run result'
            data={vintedExecution.rawResult}
            maxHeight={220}
            className='bg-white/5'
          />
        </div>
      ) : null}

      {listing.exportHistory && listing.exportHistory.length > 0 ? (
        <Card variant='glass' padding='none' className='mt-4 bg-white/5 overflow-hidden'>
          <Button
            variant='ghost'
            size='sm'
            onClick={(): void =>
              setHistoryOpenByListing((prev: Record<string, boolean>) => ({
                ...prev,
                [listing.id]: !isHistoryOpen,
              }))
            }
            className='flex w-full items-center justify-between rounded-none h-10 px-3 hover:bg-white/5 transition-colors group'
          >
            <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-gray-400'>
              Export history ({listing.exportHistory?.length ?? 0})
            </span>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] text-gray-500 font-bold uppercase'>
                {isHistoryOpen ? 'Hide' : 'Show'}
              </span>
              {isHistoryOpen ? (
                <ChevronUp className='size-3 text-gray-500' />
              ) : (
                <ChevronDown className='size-3 text-gray-500' />
              )}
            </div>
          </Button>
          {isHistoryOpen ? (
            <div className='p-3 space-y-3 border-t border-white/5 max-h-60 overflow-y-auto'>
              {(listing.exportHistory ?? [])
                .slice(0, 10)
                .map((event: ProductListingExportEvent, index: number) => {
                  const historyBrowserMode = resolveHistoryBrowserMode(event.fields);
                  const historyDisplayFields = resolveDisplayHistoryFields(event.fields);

                  return (
                    <div key={`${listing.id}-export-${index}`} className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[10px] font-mono text-gray-400'>
                        {formatTimestamp(event.exportedAt)}
                      </span>
                      <StatusBadge status={event.status ?? 'success'} size='sm' />
                    </div>
                    <div className='grid gap-1 px-1'>
                      <MetadataItem
                        label='Inventory'
                        value={formatListValue(event.inventoryId)}
                        variant='subtle'
                      />
                      <MetadataItem
                        label='Template'
                        value={formatListValue(event.templateId)}
                        variant='subtle'
                      />
                      <MetadataItem
                        label='Warehouse'
                        value={formatListValue(event.warehouseId)}
                        variant='subtle'
                      />
                      {(isPlaywrightListing || isTraderaListing || isVintedListing) && historyBrowserMode && (
                        <MetadataItem
                          label='Browser mode'
                          value={historyBrowserMode}
                          variant='subtle'
                        />
                      )}
                      {event.externalListingId && (
                        <MetadataItem
                          label='External ID'
                          value={event.externalListingId}
                          mono
                          variant='subtle'
                        />
                      )}
                      {event.requestId && (
                        <MetadataItem
                          label='Request ID'
                          value={event.requestId}
                          mono
                          variant='subtle'
                        />
                      )}
                      <MetadataItem
                        label='Fields'
                        value={
                          historyDisplayFields.length > 0 ? historyDisplayFields.join(', ') : '—'
                        }
                        variant='subtle'
                      />
                    </div>
                    {index < Math.min(listing.exportHistory?.length ?? 0, 10) - 1 && (
                      <div className='mt-3 border-b border-white/5' />
                    )}
                    </div>
                  );
                })}
            </div>
          ) : null}
        </Card>
      ) : (
        <div className='mt-3 px-1'>
          <Hint>No export history recorded for this marketplace connection.</Hint>
        </div>
      )}
    </div>
  );
}
