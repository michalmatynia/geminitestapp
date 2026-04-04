import { Alert } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';

export function ProductFormGeneralSkeleton(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <Alert variant='warning' className='px-4 py-3'>
        <Skeleton className='h-4 w-full' />
      </Alert>

      <div className='space-y-4'>
        <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
          <Skeleton className='h-4 w-40' />
        </div>
        <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
          <div className='mb-3 flex gap-2'>
            <Skeleton className='h-7 w-24' />
            <Skeleton className='h-7 w-24' />
            <Skeleton className='h-7 w-24' />
          </div>
          <Skeleton className='h-10 w-full' />
        </div>
        <div className='rounded-md border border-slate-500/30 bg-slate-500/5 px-4 py-3'>
          <div className='mb-3 flex gap-2'>
            <Skeleton className='h-7 w-28' />
            <Skeleton className='h-7 w-28' />
            <Skeleton className='h-7 w-28' />
          </div>
          <Skeleton className='h-24 w-full' />
        </div>
      </div>
    </div>
  );
}
