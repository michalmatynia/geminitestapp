'use client';

import React from 'react';
import type { ProductScanSupplierPrice } from '@/shared/contracts/product-scans';
import { buildInlineSummary } from './ProductScan1688Details.helpers';

type ProductScan1688PricesListProps = {
  prices: ProductScanSupplierPrice[];
};

function formatPriceAmount(p: ProductScanSupplierPrice): string | null {
  if (typeof p.amount === 'string' && p.amount !== '' && typeof p.currency === 'string' && p.currency !== '') {
    return `${p.amount} ${p.currency}`;
  }
  return p.amount ?? null;
}

function formatPriceRange(p: ProductScanSupplierPrice): string | null {
  if (typeof p.rangeStart === 'string' && p.rangeStart !== '' && typeof p.rangeEnd === 'string' && p.rangeEnd !== '') {
    return `${p.rangeStart} - ${p.rangeEnd}`;
  }
  return null;
}

function formatPriceLine(p: ProductScanSupplierPrice): string | null {
  const amount = formatPriceAmount(p);
  const range = formatPriceRange(p);
  const moq = (typeof p.moq === 'string' && p.moq !== '') ? `MOQ ${p.moq}` : null;
  
  return buildInlineSummary(p.label, amount, range, moq, p.unit);
}

export function ProductScan1688PricesList({ prices }: ProductScan1688PricesListProps): React.JSX.Element | null {
  if (prices.length === 0) return null;

  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Extracted prices</p>
      <ul className='space-y-2 text-sm text-foreground'>
        {prices.map((p, i) => (
          <li key={`${p.label ?? 'price'}-${p.amount ?? 'na'}-${i}`} className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'>
            {formatPriceLine(p) ?? 'Unlabeled supplier price'}
          </li>
        ))}
      </ul>
    </div>
  );
}
