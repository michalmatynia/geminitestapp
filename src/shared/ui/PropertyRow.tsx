'use client';

import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface PropertyRowProps {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  mono?: boolean;
}

export function PropertyRow({
  label,
  value,
  children,
  icon,
  className,
  labelClassName,
  valueClassName,
  mono = false,
}: PropertyRowProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center gap-2 text-[11px]', className)}>
      {icon && <div className='shrink-0 text-gray-500'>{icon}</div>}
      <span className={cn('uppercase font-bold tracking-wider text-gray-500 shrink-0', labelClassName)}>
        {label}:
      </span>
      <div className={cn(
        'text-gray-300 truncate',
        mono && 'font-mono text-gray-200',
        valueClassName
      )}>
        {children ?? value ?? '—'}
      </div>
    </div>
  );
}
