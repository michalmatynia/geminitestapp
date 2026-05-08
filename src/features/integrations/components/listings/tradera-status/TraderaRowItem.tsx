import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

type TraderaRowListing = {
  status: string;
  title: string;
  listingId: string;
};

type TraderaRowItemProps = {
  listing: TraderaRowListing;
  onRetry: () => void;
};

export function TraderaRowItem({
  listing,
  onRetry,
}: TraderaRowItemProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-between rounded-lg border border-border/60 bg-card/30 p-3'>
      <div className='flex items-center gap-3'>
        <div className={cn('size-2 rounded-full', listing.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500')} />
        <div>
          <div className='text-sm font-medium text-white'>{listing.title}</div>
          <div className='text-xs text-muted-foreground'>{listing.listingId}</div>
        </div>
      </div>
      {listing.status === 'error' && (
        <button onClick={onRetry} className='text-xs text-blue-400 hover:underline'>Retry</button>
      )}
    </div>
  );
}
