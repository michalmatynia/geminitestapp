import { Skeleton } from '@/shared/ui/primitives.public';

export default function Loading(): React.JSX.Element {
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
