'use client';

// AdminProductsPageView: top-level view component for the products admin
// list. Composes toolbar, filters, table surface and modals. Keep UI layout
// concerns here; business logic and data-fetching live in hooks and context.


import dynamic from 'next/dynamic';

import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Skeleton } from '@/shared/ui/skeleton';

const AdminProductsPageRuntime = dynamic(
  () =>
    import('./AdminProductsPageRuntime').then(
      (mod: typeof import('./AdminProductsPageRuntime')) => mod.AdminProductsPageRuntime
    ),
  {
    ssr: false,
    loading: () => <AdminProductsPageLoading />,
  }
);

function AdminProductsPageLoading(): React.JSX.Element {
  return (
    <div className='space-y-4' data-testid='admin-products-page-loading'>
      <div className='space-y-2'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='h-8 w-56' />
      </div>
      <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
        <div className='flex flex-wrap gap-2'>
          <Skeleton className='h-8 w-28' />
          <Skeleton className='h-8 w-24' />
          <Skeleton className='h-8 w-32' />
        </div>
        <div className='space-y-2 rounded-md border border-white/10 p-4'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
      </div>
    </div>
  );
}

export function AdminProductsPageView(): React.JSX.Element {
  return (
    <AppErrorBoundary source='products.AdminProductsPageView'>
      <AdminProductsPageRuntime />
    </AppErrorBoundary>
  );
}
