'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ListTree, WandSparkles, Workflow } from 'lucide-react';

import { AdminPlaywrightBreadcrumbs } from '@/shared/ui/admin.public';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Button, Skeleton } from '@/shared/ui/primitives.public';

const AdminPlaywrightLiveScripterPageRuntime = dynamic(
  () =>
    import('./AdminPlaywrightLiveScripterPageRuntime').then(
      (mod) => mod.AdminPlaywrightLiveScripterPageRuntime
    ),
  {
    ssr: false,
    loading: () => <AdminPlaywrightLiveScripterPageLoading />,
  }
);

function AdminPlaywrightLiveScripterPageLoading(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <Skeleton className='h-28 w-full' />
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,420px)]'>
        <Skeleton className='h-[560px] w-full' />
        <Skeleton className='h-[560px] w-full' />
      </div>
    </div>
  );
}

export function AdminPlaywrightLiveScripterPageView(): React.JSX.Element {
  return (
    <AppErrorBoundary source='playwright.AdminPlaywrightLiveScripterPageView'>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <AdminPlaywrightBreadcrumbs current='Live Scripter' />
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h1 className='flex items-center gap-2 text-xl font-semibold'>
                <WandSparkles className='size-5 text-sky-300' />
                Live Website Scripter
              </h1>
              <p className='text-sm text-muted-foreground'>
                Drive a live browser session, point at real DOM elements, and append playable Step
                Sequencer steps without guessing selectors first.
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Button asChild type='button' size='sm' variant='outline'>
                <Link href='/admin/playwright/step-sequencer'>
                  <Workflow className='mr-2 size-4' />
                  Step Sequencer
                </Link>
              </Button>
              <Button asChild type='button' size='sm' variant='outline'>
                <Link href='/admin/playwright/step-sequencer/runs'>
                  <ListTree className='mr-2 size-4' />
                  Run History
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <AdminPlaywrightLiveScripterPageRuntime />
      </div>
    </AppErrorBoundary>
  );
}
