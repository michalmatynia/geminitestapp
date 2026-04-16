'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

import { CopyButton } from '@/shared/ui/copy-button';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

type ProductScanUrlInfoProps = {
  scan: ProductScanRecord;
  isAmazonScan: boolean;
};

export function ProductScanUrlInfo({
  scan,
  isAmazonScan,
}: ProductScanUrlInfoProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {typeof scan.url === 'string' && scan.url !== '' ? (
        <a
          href={scan.url}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 text-xs text-primary hover:underline'
        >
          Open {isAmazonScan ? 'Amazon' : '1688'} Result
          <ExternalLink className='h-3.5 w-3.5' />
        </a>
      ) : null}
      {isAmazonScan === true && typeof scan.asin === 'string' && scan.asin !== '' ? (
        <div className='flex items-center gap-2 border-l border-border/50 pl-2'>
          <span className='text-xs font-medium uppercase text-muted-foreground'>ASIN</span>
          <span className='text-xs font-mono font-medium'>{scan.asin}</span>
          <CopyButton
            value={scan.asin}
            ariaLabel='Copy ASIN'
            size='sm'
            className='h-5 px-1.5'
            showText
          />
        </div>
      ) : null}
    </div>
  );
}
