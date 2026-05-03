'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DatabaseIcon, ListTree, Workflow } from 'lucide-react';

import { AdminPlaywrightBreadcrumbs } from '@/shared/ui/admin.public';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Button, Skeleton } from '@/shared/ui/primitives.public';

type AdminPlaywrightProgrammableIntegrationPageProps = {
  focusSection?: 'script' | 'import' | null;
};

const AdminPlaywrightProgrammableIntegrationPageRuntime = dynamic(
  () =>
    import('./AdminPlaywrightProgrammableIntegrationPageRuntime').then(
      (mod) => mod.AdminPlaywrightProgrammableIntegrationPageRuntime
    ),
  {
    ssr: false,
    loading: () => <AdminPlaywrightProgrammableIntegrationPageLoading />,
  }
);

function AdminPlaywrightProgrammableIntegrationPageLoading(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <Skeleton className='h-28 w-full' />
      <div className='space-y-4'>
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-48 w-full' />
        <div className='grid gap-4 xl:grid-cols-2'>
          <Skeleton className='h-[420px] w-full' />
          <Skeleton className='h-[420px] w-full' />
        </div>
      </div>
    </div>
  );
}

export default function AdminPlaywrightProgrammableIntegrationPage({
  focusSection = null,
}: AdminPlaywrightProgrammableIntegrationPageProps): React.JSX.Element {
  return (
    <AppErrorBoundary source='playwright.AdminPlaywrightProgrammableIntegrationPage'>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <AdminPlaywrightBreadcrumbs current='Programmable' />
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h1 className='text-xl font-semibold'>Playwright Programmable</h1>
              <p className='text-sm text-muted-foreground'>
                Configure programmable listing and import scripts, capture routes, field mapping,
                and the selected Step Sequencer actions that own browser behavior.
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
                  Action Runs
                </Link>
              </Button>
              <Button asChild type='button' size='sm' variant='outline'>
                <Link href='/admin/integrations/selectors'>
                  <DatabaseIcon className='mr-2 size-4' />
                  Selector Registry
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <AdminPlaywrightProgrammableIntegrationPageRuntime focusSection={focusSection} />
      </div>
    </AppErrorBoundary>
  );
}
