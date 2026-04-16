import type React from 'react';

export function AdminRouteLoading(): React.JSX.Element {
  return (
    <div
      aria-label='Loading admin page'
      className='space-y-6 animate-in fade-in duration-300'
      data-testid='admin-route-loading'
      role='status'
    >
      <div className='space-y-3'>
        <div className='h-8 w-48 rounded-lg bg-slate-800/80 animate-pulse' />
        <div className='h-4 w-80 max-w-full rounded bg-slate-800/60 animate-pulse' />
      </div>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]'>
        <div className='space-y-4 rounded-2xl border border-border/70 bg-slate-900/60 p-5'>
          <div className='h-5 w-40 rounded bg-slate-800/70 animate-pulse' />
          <div className='space-y-3'>
            <div className='h-12 rounded-xl bg-slate-800/60 animate-pulse' />
            <div className='h-12 rounded-xl bg-slate-800/60 animate-pulse' />
            <div className='h-48 rounded-2xl bg-slate-800/50 animate-pulse' />
          </div>
        </div>
        <div className='hidden space-y-4 rounded-2xl border border-border/70 bg-slate-900/60 p-5 xl:block'>
          <div className='h-5 w-32 rounded bg-slate-800/70 animate-pulse' />
          <div className='h-24 rounded-2xl bg-slate-800/50 animate-pulse' />
          <div className='h-24 rounded-2xl bg-slate-800/50 animate-pulse' />
        </div>
      </div>
    </div>
  );
}
