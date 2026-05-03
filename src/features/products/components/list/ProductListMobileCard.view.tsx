'use client';

import type React from 'react';

import { ProductListMobileCardActions } from './ProductListMobileCard.actions';
import { ProductListMobileCardHeader } from './ProductListMobileCard.header';
import { ProductListMobileCardPriceStock } from './ProductListMobileCard.price-stock';
import { ProductListMobileCardStatus } from './ProductListMobileCard.status';
import type { ProductListMobileCardViewProps } from './ProductListMobileCards.types';

export function ProductListMobileCardView({
  product,
  isSelected,
  toggleSelection,
  prefetchListings,
  rowActions,
  rowVisuals,
  rowRuntime,
  model,
}: ProductListMobileCardViewProps): React.JSX.Element {
  return (
    <li
      className='rounded-lg border border-border/60 bg-card/70 p-3 shadow-sm'
      onMouseEnter={(): void => rowActions.onPrefetchProductDetail(product.id)}
    >
      <ProductListMobileCardHeader
        product={product}
        isSelected={isSelected}
        toggleSelection={toggleSelection}
        rowActions={rowActions}
        model={model}
      />
      <ProductListMobileCardStatus product={product} rowRuntime={rowRuntime} model={model} />
      <ProductListMobileCardPriceStock product={product} model={model} />
      <ProductListMobileCardActions
        product={product}
        prefetchListings={prefetchListings}
        rowActions={rowActions}
        rowVisuals={rowVisuals}
        rowRuntime={rowRuntime}
      />
      <div className='mt-2 text-[11px] text-muted-foreground'>Created {model.createdAtLabel}</div>
    </li>
  );
}
