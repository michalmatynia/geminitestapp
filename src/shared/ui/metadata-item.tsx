import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface MetadataItemProps {
  label: ReactNode;
  value?: ReactNode | undefined;
  children?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  hint?: string | undefined;
  className?: string | undefined;
  labelClassName?: string | undefined;
  valueClassName?: string | undefined;
  mono?: boolean | undefined;
  variant?: 'card' | 'minimal' | 'subtle' | undefined;
}

export function MetadataItem({
  label,
  value,
  children,
  icon,
  hint,
  className,
  labelClassName,
  valueClassName,
  mono = false,
  variant = 'card',
}: MetadataItemProps): React.JSX.Element {
  const content = children ?? value ?? '—';
  const isStringLabel = typeof label === 'string';

  if (variant === 'minimal' || variant === 'subtle') {
    const isSubtle = variant === 'subtle';
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-[11px]',
          isSubtle ? 'opacity-80' : '',
          className
        )}
      >
        {icon && <div className='shrink-0 text-gray-500'>{icon}</div>}
        <span
          className={cn(
            'uppercase tracking-wider text-gray-500 shrink-0',
            isSubtle ? 'font-medium' : 'font-bold',
            labelClassName
          )}
        >
          {label}
          {isStringLabel ? ':' : ''}
        </span>
        <div
          className={cn(
            'text-gray-300 truncate',
            mono && 'font-mono text-gray-200',
            valueClassName
          )}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-3 rounded-lg bg-card/40 border border-border/60', className)}>
      <div className='flex items-center gap-1.5 mb-1'>
        {icon && <div className='shrink-0 text-gray-500'>{icon}</div>}
        <span
          className={cn(
            'block text-gray-500 text-[10px] uppercase font-bold tracking-wider leading-none',
            labelClassName
          )}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          'text-gray-200 text-sm truncate',
          mono && 'font-mono text-gray-300',
          valueClassName
        )}
      >
        {content}
      </div>
      {hint && (
        <div className='mt-1 text-[11px] text-gray-500 truncate' title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}
