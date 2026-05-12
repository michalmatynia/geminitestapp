'use client';

import React from 'react';

import { ProductListMarketplaceIconButton } from './ProductListMarketplaceButton';

type ProductListOpenIntegrationsButtonProps = {
  onClick: () => void;
  onFocus: () => void;
  onMouseEnter: () => void;
};

export function ProductListOpenIntegrationsButton({
  onClick,
  onFocus,
  onMouseEnter,
}: ProductListOpenIntegrationsButtonProps): React.JSX.Element {
  return (
    <ProductListMarketplaceIconButton
      type='button'
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      label='View integrations'
      className='border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-white transition-colors'
    >
      <span
        aria-hidden='true'
        className='inline-flex size-full items-center justify-center text-[20px] font-medium leading-none tracking-tight -translate-y-[1px]'
      >
        +
      </span>
    </ProductListMarketplaceIconButton>
  );
}
