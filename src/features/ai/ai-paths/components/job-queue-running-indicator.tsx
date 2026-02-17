import React from 'react';

import { StatusBadge } from '@/shared/ui';

export function RunningIndicator({
  label = 'Running',
}: {
  label?: string;
}): React.JSX.Element {
  return (
    <StatusBadge
      status={label}
      variant='processing'
      size='sm'
      icon={(
        <span className='relative inline-flex h-2 w-2'>
          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/80' />
          <span className='relative inline-flex h-2 w-2 rounded-full bg-sky-300' />
        </span>
      )}
    />
  );
}
