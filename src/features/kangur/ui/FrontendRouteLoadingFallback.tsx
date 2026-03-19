'use client';

import { KangurRouteLoadingFallback } from '@/features/kangur/ui/components/KangurRouteLoadingFallback';
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';

const GenericFrontendLoadingFallback = (): React.JSX.Element => (
  <div
    className='min-h-screen w-full animate-pulse bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f7fb_46%,_#eef2f8_100%)]'
    data-testid='frontend-route-loading-fallback'
  >
    <div className='mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-16'>
      <div className='h-14 w-56 rounded-full bg-white/80 shadow-[0_20px_40px_-30px_rgba(90,104,150,0.24)]' />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]'>
        <div className='min-h-[18rem] rounded-[32px] bg-white/78 shadow-[0_30px_70px_-38px_rgba(87,101,149,0.24)]' />
        <div className='flex min-h-[18rem] flex-col gap-4 rounded-[32px] bg-white/74 p-6 shadow-[0_28px_64px_-38px_rgba(87,101,149,0.22)]'>
          <div className='h-8 w-36 rounded-full bg-slate-200/70' />
          <div className='h-4 w-full rounded-full bg-slate-200/70' />
          <div className='h-4 w-4/5 rounded-full bg-slate-200/70' />
          <div className='h-4 w-2/3 rounded-full bg-slate-200/70' />
        </div>
      </div>
    </div>
  </div>
);

export function FrontendRouteLoadingFallback(): React.JSX.Element {
  const publicOwnerContext = useOptionalFrontendPublicOwner();

  if (publicOwnerContext?.publicOwner === 'kangur') {
    return <KangurRouteLoadingFallback />;
  }

  return <GenericFrontendLoadingFallback />;
}
