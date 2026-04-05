'use client';

import React from 'react';
import { Button } from '@/shared/ui/button';

import { cn } from '@/shared/utils/ui-utils';

import { getMarketplaceButtonClass } from '../product-column-utils';

export function PlaywrightStatusButton(props: {
  status: string;
  prefetchListings: () => void;
  onOpenListings: () => void;
}): React.JSX.Element {
  const { status, prefetchListings, onOpenListings } = props;

  const label = `Manage Playwright listing (${status}).`;

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
        getMarketplaceButtonClass(status, true, 'playwright')
      )}
    >
      <span
        aria-hidden='true'
        className='text-[9px] font-black uppercase leading-none tracking-tight'
      >
        PW
      </span>
    </Button>
  );
}
