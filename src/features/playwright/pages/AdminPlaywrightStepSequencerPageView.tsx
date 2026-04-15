'use client';

import dynamic from 'next/dynamic';

import { AdminPlaywrightBreadcrumbs } from '@/shared/ui/admin.public';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Skeleton } from '@/shared/ui/skeleton';

const AdminPlaywrightStepSequencerPageRuntime = dynamic(
  () =>
    import('./AdminPlaywrightStepSequencerPageRuntime').then(
      (mod) => mod.AdminPlaywrightStepSequencerPageRuntime
    ),
  {
    ssr: false,
    loading: () => <AdminPlaywrightStepSequencerPageLoading />,
  }
);

function AdminPlaywrightStepSequencerPageLoading(): React.JSX.Element {
  return (
    <div className='space-y-6' data-testid='admin-playwright-step-sequencer-page-loading'>
      {/* Action constructor skeleton */}
      <div className='space-y-2'>
        <Skeleton className='h-4 w-36' />
        <Skeleton className='h-3 w-64' />
        <div className='flex gap-3'>
          <div className='h-[200px] w-[280px] rounded-lg border border-white/10 bg-black/10' />
          <Skeleton className='h-[200px] flex-1 rounded-lg' />
        </div>
      </div>
      {/* List skeleton */}
      <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
        <div className='flex gap-2'>
          <Skeleton className='h-7 w-28' />
          <Skeleton className='h-7 w-24' />
        </div>
        <Skeleton className='h-8 w-full' />
        <div className='space-y-2 rounded-md border border-white/10 p-3'>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className='h-9 w-full' />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPlaywrightStepSequencerPageView(): React.JSX.Element {
  return (
    <AppErrorBoundary source='playwright.AdminPlaywrightStepSequencerPageView'>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <AdminPlaywrightBreadcrumbs current='Step Sequencer' />
          <h1 className='text-xl font-semibold'>Playwright Step Sequencer</h1>
          <p className='text-sm text-muted-foreground'>
            Manage reusable automation steps and step sets, then compose them into named actions
            using the tree constructor.
          </p>
        </div>
        <AdminPlaywrightStepSequencerPageRuntime />
      </div>
    </AppErrorBoundary>
  );
}
