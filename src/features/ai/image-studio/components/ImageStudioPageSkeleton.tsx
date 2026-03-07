import React from 'react';

import { Skeleton } from '@/shared/ui';

export function ImageStudioPageSkeleton(): React.JSX.Element {
  return (
    <div className='flex h-full min-h-0 min-w-0 flex-1 overflow-hidden'>
      <div className='grid h-full min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)_minmax(0,420px)]'>
        <div className='hidden h-full min-h-0 min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/50 md:flex md:flex-col'>
          <div className='border-b border-border/60 p-3'>
            <Skeleton className='h-8 w-full' />
          </div>
          <div className='space-y-3 p-3'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-8 w-[90%]' />
            <Skeleton className='h-8 w-[82%]' />
            <Skeleton className='h-8 w-[74%]' />
            <Skeleton className='h-28 w-full' />
          </div>
        </div>

        <div className='flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40'>
          <div className='border-b border-border/60 px-4 py-3'>
            <div className='flex items-center justify-between gap-2'>
              <Skeleton className='h-7 w-28' />
              <Skeleton className='h-7 w-20' />
            </div>
          </div>
          <div className='flex-1 p-4'>
            <Skeleton className='h-full w-full rounded-xl' />
          </div>
          <div className='border-t border-border/60 p-3'>
            <div className='grid grid-cols-3 gap-2'>
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-16 w-full' />
            </div>
          </div>
        </div>

        <div className='hidden h-full min-h-0 min-w-0 overflow-hidden rounded-lg border border-border/60 bg-card/50 lg:flex lg:flex-col'>
          <div className='border-b border-border/60 p-3'>
            <Skeleton className='h-8 w-full' />
          </div>
          <div className='space-y-3 p-3'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-[85%]' />
            <Skeleton className='h-24 w-full' />
          </div>
        </div>
      </div>
    </div>
  );
}
