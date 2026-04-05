import React from 'react';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

export type MassListProgressPanelProps = {
  current: number;
  total: number;
  errors: number;
};

export function MassListProgressPanel({
  current,
  total,
  errors,
}: MassListProgressPanelProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm text-gray-300'>
          Processing {current} of {total}...
        </p>
        <LoadingState size='sm' className='p-0' />
      </div>
      <div className='h-2 w-full rounded-full bg-card/40'>
        <div
          className='h-full rounded-full bg-primary transition-all duration-300'
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      {errors > 0 && <p className='text-xs text-red-400'>{errors} failures so far</p>}
    </div>
  );
}
