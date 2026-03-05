'use client';

import React from 'react';

import { Label, Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface StudioCardProps {
  label?: string | undefined;
  count?: number | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

type StudioCardRuntimeValue = {
  className?: string;
};

const StudioCardRuntimeContext = React.createContext<StudioCardRuntimeValue | null>(null);

function useStudioCardRuntime(): StudioCardRuntimeValue {
  const runtime = React.useContext(StudioCardRuntimeContext);
  if (!runtime) {
    throw new Error('useStudioCardRuntime must be used within StudioCardRuntimeContext.Provider');
  }
  return runtime;
}

function StudioCardShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { className } = useStudioCardRuntime();
  return (
    <Card variant='glass' padding='sm' className={cn('grid grid-cols-1 gap-2', className)}>
      {children}
    </Card>
  );
}

export function StudioCard({
  label,
  count,
  children,
  className,
}: StudioCardProps): React.JSX.Element {
  return (
    <StudioCardRuntimeContext.Provider value={{ className }}>
      <StudioCardShell>
        {label != null && (
          <Label className='text-[11px] text-gray-300'>
            {label}
            {count != null && ` (${count})`}
          </Label>
        )}
        {children}
      </StudioCardShell>
    </StudioCardRuntimeContext.Provider>
  );
}
