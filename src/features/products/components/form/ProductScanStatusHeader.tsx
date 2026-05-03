'use client';

import { Loader2, Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/button';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import {
  resolveStatusLabel,
  resolveStatusClassName,
  formatTimestamp,
} from './ProductFormScans.helpers';

type ProductScanStatusHeaderProps = {
  scan: ProductScanRecord;
  productName: string;
  isAmazonScan: boolean;
  resolvedConnectionLabel: string | null;
  isDeleting: boolean;
  onDelete: (scanId: string) => void;
};

export function ProductScanStatusHeader({
  scan,
  productName,
  isAmazonScan,
  resolvedConnectionLabel,
  isDeleting,
  onDelete,
}: ProductScanStatusHeaderProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium'>{productName}</span>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
          {isAmazonScan ? 'Amazon' : '1688'}
        </span>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${resolveStatusClassName(scan)}`}
        >
          {isProductScanActiveStatus(scan.status) ? (
            <Loader2 className='mr-1 h-3 w-3 animate-spin' />
          ) : null}
          {resolveStatusLabel(scan)}
        </span>
        {isAmazonScan === false && resolvedConnectionLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
            Profile {resolvedConnectionLabel}
          </span>
        ) : null}
      </div>
      <div className='flex items-center gap-4'>
        <span className='text-xs text-muted-foreground'>{formatTimestamp(scan.createdAt)}</span>
        <Button
          type='button'
          variant='ghost'
          size='xs'
          onClick={() => onDelete(scan.id)}
          disabled={isDeleting}
          className='h-7 w-7 p-0 text-muted-foreground hover:text-destructive'
        >
          {isDeleting ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <Trash2 className='h-3.5 w-3.5' />
          )}
          <span className='sr-only'>Delete scan</span>
        </Button>
      </div>
    </div>
  );
}
