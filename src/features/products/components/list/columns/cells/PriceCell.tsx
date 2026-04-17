'use client';

import { memo } from 'react';
import type { Row } from '@tanstack/react-table';
import type { ProductWithImages, PriceGroupWithDetails } from '@/shared/contracts/products/product';
import { useProductListRowVisualsContext } from '@/features/products/context/ProductListContext';
import { calculatePriceForCurrency, normalizeCurrencyCode } from '@/shared/lib/products/utils/priceCalculation';
import { EditableCell } from '@/features/products/components/EditableCell';
import { Tooltip } from '@/shared/ui/tooltip';

type PriceInfo = {
  price: number | null;
  currencyCode: string | null;
  baseCurrencyCode: string | null;
};

function resolveConvertedPrice(
  productPrice: number | null, 
  displayPrice: number | null, 
  baseCurrencyCode: string | null, 
  currencyCode: string
): boolean {
  const normBase = baseCurrencyCode !== null ? normalizeCurrencyCode(baseCurrencyCode) : null;
  const normCurr = normalizeCurrencyCode(currencyCode);
  const isDiffCurr = normBase !== null && normBase !== normCurr;
  
  return displayPrice !== null && productPrice !== null && isDiffCurr && displayPrice !== productPrice;
}

function ConvertedPriceDisplay({ displayPrice, productPrice, baseCurrencyCode }: { displayPrice: number, productPrice: number, baseCurrencyCode: string }): React.JSX.Element {
  return (
    <div className='flex flex-col items-start'>
      <span className='text-foreground'>{displayPrice.toFixed(2)}</span>
      <span className='text-xs text-muted-foreground'>
        Base: {productPrice.toFixed(2)} {baseCurrencyCode}
      </span>
    </div>
  );
}

function ConvertedPriceTooltip({ displayPrice, actualCurrency }: { displayPrice: number, actualCurrency: string }): React.JSX.Element {
  const tooltipText = `Converted: ${displayPrice.toFixed(2)} ${actualCurrency}`;
  return (
    <Tooltip content={tooltipText}>
      <button type='button' className='rounded-sm border-0 bg-transparent p-0 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950' aria-label={`Converted price: ${displayPrice.toFixed(2)} ${actualCurrency}`} title={tooltipText}>
        →{displayPrice.toFixed(2)}
      </button>
    </Tooltip>
  );
}

function resolvePriceInfo(product: ProductWithImages, currencyCode: string, priceGroups: PriceGroupWithDetails[]): PriceInfo {
  return calculatePriceForCurrency(
    product.price,
    product.defaultPriceGroupId,
    currencyCode,
    priceGroups
  );
}

function PriceCellBase({ productId, price }: { productId: string, price: number | null }): React.JSX.Element {
  return (
    <EditableCell value={price} productId={productId} field='price' onUpdate={(): void => { /* handled optimistically */ }} />
  );
}

function PriceCellContentIndicator({ info }: { info: PriceInfo }): React.JSX.Element | null {
  const { price: displayPrice, currencyCode: actualCurrency } = info;
  if (displayPrice === null || actualCurrency === null) return null;

  return (
    <ConvertedPriceTooltip displayPrice={displayPrice} actualCurrency={actualCurrency} />
  );
}

function PriceCellContent({ product, info, currencyCode }: { product: ProductWithImages, info: PriceInfo, currencyCode: string }): React.JSX.Element {
  const isConverted = resolveConvertedPrice(product.price, info.price, info.baseCurrencyCode, currencyCode);

  if (isConverted === true && info.price !== null && product.price !== null && info.baseCurrencyCode !== null) {
    return <ConvertedPriceDisplay displayPrice={info.price} productPrice={product.price} baseCurrencyCode={info.baseCurrencyCode} />;
  }

  const showIndicator = info.currencyCode !== null && info.currencyCode !== currencyCode;

  return (
    <div className='flex items-center gap-1'>
      <PriceCellBase productId={product.id} price={product.price} />
      {showIndicator === true && (
        <PriceCellContentIndicator info={info} />
      )}
    </div>
  );
}

export const PriceCell: React.FC<{ row: Row<ProductWithImages> }> = memo(({ row }) => {
  const product = row.original;
  const { currencyCode, priceGroups } = useProductListRowVisualsContext();

  const info: PriceInfo = resolvePriceInfo(product, currencyCode, priceGroups);

  return <PriceCellContent product={product} info={info} currencyCode={currencyCode} />;
});

PriceCell.displayName = 'PriceCell';
