import React from 'react';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import type { ProgressSnapshotDto } from '@/shared/contracts/base';

export type MassListProgressPanelProps = ProgressSnapshotDto & {
  paused?: boolean;
};

export function MassListProgressPanel({
  current,
  total,
  errors,
  paused = false,
}: MassListProgressPanelProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm text-gray-300'>
          {paused ? `Paused at ${current} of ${total}.` : `Processing ${current} of ${total}...`}
        </p>
        {paused ? (
          <p className='text-xs font-medium text-amber-300'>Session recovery required</p>
        ) : (
          <LoadingState size='sm' className='p-0' />
        )}
      </div>
      <div className='h-2 w-full rounded-full bg-card/40'>
        <div
          className='h-full rounded-full bg-primary transition-all duration-300'
          style={{ width: `${total > 0 ? (current / total) * 100 : 0}%` }}
        />
      </div>
      {errors > 0 && <p className='text-xs text-red-400'>{errors} failures so far</p>}
    </div>
  );
}
