import { Badge } from '@/shared/ui/primitives.public';

export function FrontPageStatus({
  currentLabel,
  isDirty,
  pendingLabel,
}: {
  currentLabel: string;
  isDirty: boolean;
  pendingLabel: string;
}) {
  return (
    <div className='rounded-xl border border-border/40 bg-card/20 px-4 py-3 text-sm text-gray-300'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-gray-400'>Current live HOME:</span>
        <Badge variant='outline' className='border-white/10 text-white'>
          {currentLabel}
        </Badge>
        {isDirty && (
          <Badge variant='active' className='border-blue-500/60 text-blue-200'>
            Unsaved change: {pendingLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}
