'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { StatusBadge } from '@/shared/ui';

type RunningIndicatorRuntimeValue = {
  label: string;
};

const {
  Context: RunningIndicatorRuntimeContext,
  useStrictContext: useRunningIndicatorRuntime,
} = createStrictContext<RunningIndicatorRuntimeValue>({
  hookName: 'useRunningIndicatorRuntime',
  providerName: 'RunningIndicatorRuntimeContext.Provider',
});

function RunningIndicatorBadge(): React.JSX.Element {
  const { label } = useRunningIndicatorRuntime();
  return (
    <StatusBadge
      status={label}
      variant='processing'
      size='sm'
      icon={
        <span className='relative inline-flex h-2 w-2'>
          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/80' />
          <span className='relative inline-flex h-2 w-2 rounded-full bg-sky-300' />
        </span>
      }
    />
  );
}

export function RunningIndicator({ label = 'Running' }: { label?: string }): React.JSX.Element {
  const runtimeValue = React.useMemo<RunningIndicatorRuntimeValue>(() => ({ label }), [label]);
  return (
    <RunningIndicatorRuntimeContext.Provider value={runtimeValue}>
      <RunningIndicatorBadge />
    </RunningIndicatorRuntimeContext.Provider>
  );
}
