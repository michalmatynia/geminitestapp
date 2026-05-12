'use client';

import React from 'react';

import { getMarketplaceButtonClass } from '../product-column-utils';
import { ProductListMarketplaceTextButton } from './ProductListMarketplaceButton';

export function PlaywrightStatusButton(props: {
  status: string;
  prefetchListings: () => void;
  onOpenListings: () => void;
}): React.JSX.Element {
  const { status, prefetchListings, onOpenListings } = props;

  const label = `Manage Playwright listing (${status}).`;

  return (
    <ProductListMarketplaceTextButton
      type='button'
      onClick={onOpenListings}
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      aria-label={label}
      title={label}
      toneClass={getMarketplaceButtonClass(status, true, 'playwright')}
      label='PW'
    />
  );
}
