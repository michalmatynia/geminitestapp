'use client';

import React from 'react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { getMarketplaceButtonClass } from '../product-column-utils';

export function TraderaStatusButton({
  status,
  prefetchListings,
  onOpenListings,
}: {
  status: string;
  prefetchListings: () => void;
  onOpenListings: () => void;
}): React.JSX.Element {
  const label = `Manage Tradera listing (${status}).`;

  return (
    <Button
      type='button'
      onClick={onOpenListings}
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      variant='ghost'
      size='icon'
      aria-label={label}
      title={label}
      className={cn(
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        getMarketplaceButtonClass(status, true, 'tradera')
      )}
    >
      <span
        aria-hidden='true'
        className='text-[10px] font-black uppercase leading-none tracking-tight'
      >
        T
      </span>
    </Button>
  );
}
