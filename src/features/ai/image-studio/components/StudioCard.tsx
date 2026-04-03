'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
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

const { Context: StudioCardRuntimeContext, useStrictContext: useStudioCardRuntime } =
  createStrictContext<StudioCardRuntimeValue>({
    hookName: 'useStudioCardRuntime',
    providerName: 'StudioCardRuntimeContext.Provider',
    displayName: 'StudioCardRuntimeContext',
  });

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
