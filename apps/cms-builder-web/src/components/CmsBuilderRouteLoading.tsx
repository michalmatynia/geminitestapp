type CmsBuilderRouteLoadingProps = {
  label?: string;
};

export function CmsBuilderRouteLoading({
  label = 'Loading CMS builder page',
}: CmsBuilderRouteLoadingProps): React.JSX.Element {
  return (
    <div
      aria-label={label}
      className='space-y-6 animate-in fade-in duration-300'
      data-testid='cms-builder-route-loading'
      role='status'
    >
      <div className='space-y-3'>
        <div className='h-8 w-48 animate-pulse rounded-lg bg-slate-800/80' />
        <div className='h-4 w-80 max-w-full animate-pulse rounded bg-slate-800/60' />
      </div>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]'>
        <div className='space-y-4 rounded-lg border border-border/70 bg-slate-900/60 p-5'>
          <div className='h-5 w-40 animate-pulse rounded bg-slate-800/70' />
          <div className='space-y-3'>
            <div className='h-12 animate-pulse rounded-lg bg-slate-800/60' />
            <div className='h-12 animate-pulse rounded-lg bg-slate-800/60' />
            <div className='h-48 animate-pulse rounded-lg bg-slate-800/50' />
          </div>
        </div>
        <div className='hidden space-y-4 rounded-lg border border-border/70 bg-slate-900/60 p-5 xl:block'>
          <div className='h-5 w-32 animate-pulse rounded bg-slate-800/70' />
          <div className='h-24 animate-pulse rounded-lg bg-slate-800/50' />
          <div className='h-24 animate-pulse rounded-lg bg-slate-800/50' />
        </div>
      </div>
    </div>
  );
}
