'use client';

import React from 'react';

import { Skeleton } from '@/shared/ui';

export function PageBuilderPageSkeleton(): React.JSX.Element {
  return (
    <div className='flex h-[calc(100vh-64px)] flex-col bg-background text-white'>
      <div className='flex flex-1 overflow-hidden'>
        <div className='w-72 border-r border-border bg-card'>
          <div className='flex items-center justify-between border-b border-border px-3 py-2.5'>
            <Skeleton className='h-4 w-24' />
            <div className='flex items-center gap-1'>
              <Skeleton className='size-6 rounded-sm' />
              <Skeleton className='size-6 rounded-sm' />
              <Skeleton className='size-6 rounded-sm' />
            </div>
          </div>
          <div className='space-y-2 p-3'>
            <Skeleton className='h-7 w-full' />
            <Skeleton className='h-7 w-[92%]' />
            <Skeleton className='h-7 w-[84%]' />
            <Skeleton className='h-7 w-[88%]' />
            <Skeleton className='h-7 w-[76%]' />
          </div>
        </div>

        <div className='flex min-w-0 flex-1 flex-col bg-gray-950'>
          <div className='border-b border-border px-6 py-3'>
            <div className='flex items-center justify-end gap-2'>
              <Skeleton className='h-8 w-[200px]' />
              <Skeleton className='h-8 w-[180px]' />
              <Skeleton className='h-8 w-[120px]' />
              <Skeleton className='h-8 w-8' />
              <Skeleton className='h-8 w-8' />
              <Skeleton className='h-8 w-20' />
            </div>
          </div>
          <div className='flex-1 p-6'>
            <Skeleton className='h-full w-full rounded-xl' />
          </div>
        </div>

        <div className='w-80 border-l border-border bg-card p-3'>
          <Skeleton className='mb-3 h-4 w-36' />
          <div className='space-y-2'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-8 w-[85%]' />
            <Skeleton className='h-8 w-[70%]' />
          </div>
        </div>
      </div>
    </div>
  );
}
