'use client';

import dynamic from 'next/dynamic';
import { WandSparkles } from 'lucide-react';
import { type JSX } from 'react';

import { AdminPlaywrightBreadcrumbs } from '@/shared/ui/admin.public';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Skeleton } from '@/shared/ui/primitives.public';

const ScripterEditorPageRuntime = dynamic(
  () => import('./ScripterEditorPageRuntime').then((mod) => mod.ScripterEditorPageRuntime),
  { ssr: false, loading: () => <ScripterEditorPageLoading /> }
);

function ScripterEditorPageLoading(): JSX.Element {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-24 w-full' />
      <div className='grid gap-3 xl:grid-cols-[260px_1fr]'>
        <Skeleton className='h-[420px] w-full' />
        <Skeleton className='h-[420px] w-full' />
      </div>
    </div>
  );
}

export function AdminPlaywrightScriptersPageView(): JSX.Element {
  return (
    <AppErrorBoundary source='playwright.AdminPlaywrightScriptersPageView'>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <AdminPlaywrightBreadcrumbs current='Scripters' />
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h1 className='flex items-center gap-2 text-xl font-semibold'>
                <WandSparkles className='size-5 text-amber-300' />
                Playwright Scripters
              </h1>
              <p className='text-sm text-muted-foreground'>
                Author declarative website-to-catalog scripters with a live in-browser probe.
                Compose extraction steps, map fields with transforms, preview drafts, and commit
                them straight into your product catalog.
              </p>
            </div>
          </div>
        </div>
        <ScripterEditorPageRuntime />
      </div>
    </AppErrorBoundary>
  );
}
