'use client';

import React from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { ProductScan1688Details } from '@/features/products/components/scans/ProductScan1688Details';
import { ProductScan1688ApplyPanel } from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import type { Supplier1688FormBindings } from './ProductFormScans.types';

type ProductScan1688ActionSectionProps = {
  scan: ProductScanRecord;
  isAmazonScan: boolean;
  resolvedConnectionLabel: string | null;
  supplier1688FormBindings: Supplier1688FormBindings;
};

export function ProductScan1688ActionSection({
  scan,
  isAmazonScan,
  resolvedConnectionLabel,
  supplier1688FormBindings,
}: ProductScan1688ActionSectionProps): React.JSX.Element | null {
  if (isAmazonScan === true) return null;

  return (
    <div className='mt-3 space-y-3'>
      <div className='border-t border-border/40 pt-3'>
        <ProductScan1688Details
          scan={scan}
          scanId={scan.id}
          connectionLabel={resolvedConnectionLabel}
        />
      </div>
      <div className='border-t border-border/40 pt-3'>
        <ProductScan1688ApplyPanel
          scan={scan}
          formBindings={supplier1688FormBindings}
        />
      </div>
    </div>
  );
}
