'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/button';
import { PRODUCT_SCANNER_SETTINGS_HREF } from '@/features/products/scanner-settings';

function ChevronRightIcon(props: { className?: string }): React.JSX.Element {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={props.className}>
      <path d='m9 18 6-6-6-6' />
    </svg>
  );
}

type ProductFormScansHeaderProps = {
  onSetProvider: (provider: 'amazon' | '1688') => void;
};

export function ProductFormScansHeader({ onSetProvider }: ProductFormScansHeaderProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4'>
      <div className='space-y-1'>
        <h3 className='text-lg font-semibold tracking-tight'>External Image Scans</h3>
        <p className='text-sm text-muted-foreground'>Discover product details and supplier matches using reverse image search.</p>
      </div>
      <div className='flex items-center gap-2'>
        <Button size='sm' variant='outline' onClick={(): void => onSetProvider('amazon')} className='h-9 gap-2 font-medium shadow-sm transition-all hover:bg-muted/50'>
          <Search className='h-4 w-4' /> Scan Amazon
        </Button>
        <Button size='sm' variant='outline' onClick={(): void => onSetProvider('1688')} className='h-9 gap-2 font-medium shadow-sm transition-all hover:bg-muted/50'>
          <Search className='h-4 w-4 text-blue-400' /> Scan 1688
        </Button>
        <Button variant='ghost' size='sm' className='h-9 w-9 p-0 text-muted-foreground' asChild title='Scanner Settings'>
           <Link href={PRODUCT_SCANNER_SETTINGS_HREF}><ChevronRightIcon className='h-4 w-4' /></Link>
        </Button>
      </div>
    </div>
  );
}
