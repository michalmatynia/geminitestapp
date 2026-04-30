'use client';

import type React from 'react';

import type { ProductListMobileCardViewProps } from './ProductListMobileCards.types';

type ProductListMobileCardPriceStockProps = Pick<
  ProductListMobileCardViewProps,
  'product' | 'model'
>;

export function ProductListMobileCardPriceStock({
  product,
  model,
}: ProductListMobileCardPriceStockProps): React.JSX.Element {
  return (
    <div className='mt-3 grid grid-cols-2 gap-3 text-xs'>
      <div className='space-y-0.5'>
        <div className='text-muted-foreground'>Price</div>
        <div className='text-foreground'>{model.formattedPrice}</div>
        {model.hasConvertedPrice ? (
          <div className='text-[11px] text-muted-foreground'>
            Base: {model.basePriceLabel} {model.baseCurrencyCode}
            {model.showCurrencyIndicator ? ` (${model.currencyCode})` : ''}
          </div>
        ) : null}
      </div>
      <div className='space-y-0.5'>
        <div className='text-muted-foreground'>Stock</div>
        <div className='text-foreground'>{product.stock ?? '—'}</div>
      </div>
    </div>
  );
}
