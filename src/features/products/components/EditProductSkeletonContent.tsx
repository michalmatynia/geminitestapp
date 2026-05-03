'use client';

import React from 'react';

import { Skeleton } from '@/shared/ui/skeleton';

export function EditProductSkeletonContent(): React.JSX.Element {
  return (
    <div className='space-y-6 py-2'>
      <div className='rounded-lg border border-border/60 p-4 space-y-3'>
        <Skeleton className='h-4 w-52' />
        <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
          <Skeleton className='h-9 w-full' />
        </div>
      </div>
      <div className='rounded-lg border border-border/60 p-4 space-y-3'>
        <Skeleton className='h-4 w-44' />
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-20 w-full' />
      </div>
      <p className='text-sm text-muted-foreground'>
        Please wait while complete product data is loaded.
      </p>
    </div>
  );
}
