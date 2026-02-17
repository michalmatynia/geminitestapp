'use client';

import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface MetadataItemProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  className?: string;
  valueClassName?: string;
  mono?: boolean;
}

export function MetadataItem({
  label,
  value,
  icon,
  hint,
  className,
  valueClassName,
  mono = false,
}: MetadataItemProps): React.JSX.Element {
  return (
    <div className={cn('p-3 rounded-lg bg-card/40 border border-border/60', className)}>
      <div className='flex items-center gap-1.5 mb-1'>
        {icon && <div className='shrink-0 text-gray-500'>{icon}</div>}
        <span className='block text-gray-500 text-[10px] uppercase font-bold tracking-wider leading-none'>
          {label}
        </span>
      </div>
      <div className={cn(
        'text-gray-200 text-sm truncate',
        mono && 'font-mono text-gray-300',
        valueClassName
      )}>
        {value ?? '—'}
      </div>
      {hint && (
        <div className='mt-1 text-[11px] text-gray-500 truncate' title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}
