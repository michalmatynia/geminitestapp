'use client';

import React from 'react';
import { useProductListingsContext } from '@/features/integrations/context/ProductListingsContext';
import type {
  ProductListingExportEvent,
} from '@/shared/contracts/integrations';
import { StatusBadge, Card, MetadataItem, Hint, Button } from '@/shared/ui';
import { TRADERA_INTEGRATION_SLUGS } from '@/features/integrations/constants/slugs';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProductListingItemRuntime } from './ProductListingItemRuntimeContext';

const formatTimestamp = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date: Date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const formatListValue = (value: string | null | undefined): string => (value ? value : '—');

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export function ProductListingDetails(): React.JSX.Element {
  const { listing } = useProductListingItemRuntime();
  const { product, historyOpenByListing, setHistoryOpenByListing } = useProductListingsContext();

  const isBaseListing = ['baselinker', 'base-com', 'base'].includes(
    normalizeIntegrationSlug(listing.integration.slug)
  );
  const isTraderaListing = TRADERA_INTEGRATION_SLUGS.has(
    normalizeIntegrationSlug(listing.integration.slug)
  );

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

  return (
    <div className='flex-1 min-w-0'>
      <div className='flex items-center gap-2 mb-2'>
        <span className='font-semibold text-white truncate'>{listing.integration.name}</span>
        <StatusBadge status={listing.status} />
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
                .map((event: ProductListingExportEvent, index: number) => (
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
                      {event.externalListingId && (
                        <MetadataItem
                          label='External ID'
                          value={event.externalListingId}
                          mono
                          variant='subtle'
                        />
                      )}
                      <MetadataItem
                        label='Fields'
                        value={
                          event.fields && event.fields.length > 0 ? event.fields.join(', ') : '—'
                        }
                        variant='subtle'
                      />
                    </div>
                    {index < Math.min(listing.exportHistory?.length ?? 0, 10) - 1 && (
                      <div className='mt-3 border-b border-white/5' />
                    )}
                  </div>
                ))}
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
