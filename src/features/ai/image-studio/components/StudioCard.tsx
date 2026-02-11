'use client';

import React from 'react';

import { Label } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface StudioCardProps {
  label?: string | undefined;
  count?: number | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

export function StudioCard({
  label,
  count,
  children,
  className,
}: StudioCardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 rounded border border-border/60 bg-card/40 p-2',
        className
      )}
    >
      {label != null && (
        <Label className='text-[11px] text-gray-300'>
          {label}
          {count != null && ` (${count})`}
        </Label>
      )}
      {children}
    </div>
  );
}
