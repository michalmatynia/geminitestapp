'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import { Card, Button } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import type { ProductListingExportEvent } from '@/shared/contracts/integrations/listings';
import {
  formatTimestamp,
  formatListValue,
  resolveHistoryBrowserMode,
  resolveDisplayHistoryFields,
} from './ProductListingDetails.utils';

export function ProductListingHistory({
  listingId,
  exportHistory,
  isOpen,
  onToggle,
  isPlaywrightListing,
  isTraderaListing,
  isVintedListing,
}: {
  listingId: string;
  exportHistory: ProductListingExportEvent[] | null | undefined;
  isOpen: boolean;
  onToggle: () => void;
  isPlaywrightListing: boolean;
  isTraderaListing: boolean;
  isVintedListing: boolean;
}): React.JSX.Element {
  const history = exportHistory ?? [];
  
  if (history.length === 0) {
    return (
      <div className='mt-3 px-1'>
        <Hint>No export history recorded for this marketplace connection.</Hint>
      </div>
    );
  }

  return (
    <Card variant='glass' padding='none' className='mt-4 bg-white/5 overflow-hidden'>
      <Button
        variant='ghost'
        size='sm'
        onClick={onToggle}
        className='flex w-full items-center justify-between rounded-none h-10 px-3 hover:bg-white/5 transition-colors group'
      >
        <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-gray-400'>
          Export history ({history.length})
        </span>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] text-gray-500 font-bold uppercase'>
            {isOpen ? 'Hide' : 'Show'}
          </span>
          {isOpen ? (
            <ChevronUp className='size-3 text-gray-500' />
          ) : (
            <ChevronDown className='size-3 text-gray-500' />
          )}
        </div>
      </Button>
      {isOpen ? (
        <div className='p-3 space-y-3 border-t border-white/5 max-h-60 overflow-y-auto'>
          {history
            .slice(0, 10)
            .map((event: ProductListingExportEvent, index: number) => {
              const historyBrowserMode = resolveHistoryBrowserMode(event.fields);
              const historyDisplayFields = resolveDisplayHistoryFields(event.fields);

              return (
                <div key={`${listingId}-export-${index}`} className='space-y-1.5'>
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
                    {(isPlaywrightListing || isTraderaListing || isVintedListing) && 
                      (historyBrowserMode ?? '') !== '' && (
                      <MetadataItem
                        label='Browser mode'
                        value={historyBrowserMode}
                        variant='subtle'
                      />
                    )}
                    {(event.externalListingId ?? '') !== '' && (
                      <MetadataItem
                        label='External ID'
                        value={event.externalListingId}
                        mono
                        variant='subtle'
                      />
                    )}
                    {(event.requestId ?? '') !== '' && (
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
                  {index < Math.min(history.length, 10) - 1 && (
                    <div className='mt-3 border-b border-white/5' />
                  )}
                </div>
              );
            })}
        </div>
      ) : null}
    </Card>
  );
}
