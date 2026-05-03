'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ListTree, Workflow } from 'lucide-react';

import { AdminPlaywrightBreadcrumbs } from '@/shared/ui/admin.public';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Button, Skeleton } from '@/shared/ui/primitives.public';

const AdminPlaywrightActionRunsPageRuntime = dynamic(
  () =>
    import('./AdminPlaywrightActionRunsPageRuntime').then(
      (mod) => mod.AdminPlaywrightActionRunsPageRuntime
    ),
  {
    ssr: false,
    loading: () => <AdminPlaywrightActionRunsPageLoading />,
  }
);

function AdminPlaywrightActionRunsPageLoading(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <Skeleton className='h-24 w-full' />
      <div className='grid gap-4 xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)]'>
        <Skeleton className='h-[520px] w-full' />
        <Skeleton className='h-[520px] w-full' />
      </div>
    </div>
  );
}

export function AdminPlaywrightActionRunsPageView(): React.JSX.Element {
  return (
    <AppErrorBoundary source='playwright.AdminPlaywrightActionRunsPageView'>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <AdminPlaywrightBreadcrumbs current='Action Runs' />
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h1 className='flex items-center gap-2 text-xl font-semibold'>
                <ListTree className='size-5 text-sky-300' />
                Playwright Action Runs
              </h1>
              <p className='text-sm text-muted-foreground'>
                Browse retained Step Sequencer action runs, runtime output, selector context, and
                per-step execution detail.
              </p>
            </div>
            <Button asChild type='button' size='sm' variant='outline'>
              <Link href='/admin/playwright/step-sequencer'>
                <Workflow className='mr-2 size-4' />
                Step Sequencer
              </Link>
            </Button>
          </div>
        </div>
        <AdminPlaywrightActionRunsPageRuntime />
      </div>
    </AppErrorBoundary>
  );
}
