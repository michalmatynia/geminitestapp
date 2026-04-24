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
import { useTraderaLiveExecution } from '@/features/integrations/hooks/useTraderaLiveExecution';
import type {
  ProductListingExportEvent,
} from '@/shared/contracts/integrations/listings';
import { StatusBadge, JsonViewer } from '@/shared/ui/data-display.public';
import { Card, Button } from '@/shared/ui/primitives.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { Hint, ExternalLink } from '@/shared/ui/forms-and-actions.public';
import { TraderaExecutionSteps } from '@/features/integrations/components/listings/TraderaExecutionSteps';

import { PlaywrightSection } from './details-sections/PlaywrightSection';
import { TraderaSection } from './details-sections/TraderaSection';
import { VintedSection } from './details-sections/VintedSection';

import { resolveIntegrationDisplayName } from '../../product-listings-labels';
import type { ProductListingWithDetailsProps } from './types';
import {
  formatTimestamp,
  formatListValue,
  formatTraderaDuplicateMatchStrategy,
  normalizeIntegrationSlug,
  resolveDisplayedTraderaDuplicateSummary,
  resolveTraderaStatusBadge,
  resolveHistoryBrowserMode,
  resolveHistoryAction,
  formatHistoryAction,
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
  const liveTraderaExecution = useTraderaLiveExecution(isTraderaListing ? listing : null);
  const vintedExecution = resolveVintedExecutionSummary(listing.marketplaceData);
  const playwrightExecution = resolvePlaywrightExecutionSummary(listing.marketplaceData);
  const traderaUsesCustomConnectionScript =
    isTraderaListing &&
    traderaExecution.scriptSource === 'connection' &&
    traderaExecution.scriptKind === 'custom';
  const traderaPendingLabel =
    traderaExecution.pendingAction === 'check_status'
      ? 'Pending status check'
      : traderaExecution.pendingAction === 'sync'
        ? 'Pending sync'
        : traderaExecution.pendingAction === 'move_to_unsold'
          ? 'Pending end listing'
        : traderaExecution.pendingAction === 'list'
          ? 'Pending listing'
        : 'Pending relist';
  const displayedTraderaDuplicateSummary = resolveDisplayedTraderaDuplicateSummary({
    persisted: traderaExecution,
    liveRawResult: liveTraderaExecution?.rawResult,
    liveLatestStage: liveTraderaExecution?.latestStage,
  });
  const traderaStatusBadge = isTraderaListing
    ? resolveTraderaStatusBadge(listing.status, displayedTraderaDuplicateSummary.duplicateLinked, {
        checkedStatus: traderaExecution.checkedStatus,
        lastAction: traderaExecution.lastAction,
      })
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
            <TraderaSection
              execution={traderaExecution}
              liveExecution={liveTraderaExecution}
              pendingLabel={traderaPendingLabel}
              duplicateSummary={displayedTraderaDuplicateSummary}
              usesCustomScript={traderaUsesCustomConnectionScript}
              listing={listing}
            />
          )}
          {isVintedListing && (
            <VintedSection execution={vintedExecution} />
          )}
          {isPlaywrightListing && (
            <PlaywrightSection execution={playwrightExecution} />
          )}
          <MetadataItem
            label='Created'
            value={formatTimestamp(listing.createdAt)}
            variant='subtle'
          />
          {(listing.failureReason ?? '') !== '' ? (
            <MetadataItem
              label='Failure'
              value={listing.failureReason}
              wrap
              valueClassName='text-red-400 font-medium'
              variant='minimal'
            />
          ) : null}
          {isBaseListing && (
            <MetadataItem label='Exported fields' value={getExportFieldsLabel()} variant='subtle' />
          )}
        </div>
      </div>

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
                  const historyAction = resolveHistoryAction(event.fields);
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
                      {historyAction && (
                        <MetadataItem
                          label='Action'
                          value={formatHistoryAction(historyAction)}
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
