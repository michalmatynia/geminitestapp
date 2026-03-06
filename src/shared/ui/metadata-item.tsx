import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';
import { Label } from './label';

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

function MetadataItemLabel(props: {
  label: ReactNode;
  labelClassName?: string;
  isStringLabel: boolean;
  className: string;
  withColon?: boolean;
}): React.JSX.Element {
  const label = props.label;
  const labelClassName = props.labelClassName;
  const isStringLabel = props.isStringLabel;
  const className = props.className;
  const withColon = props.withColon ?? false;

  return (
    <Label className={cn(className, labelClassName)}>
      {label}
      {withColon && isStringLabel ? ':' : ''}
    </Label>
  );
}

export function MetadataItem(props: MetadataItemProps): React.JSX.Element {
  const label = props.label;
  const value = props.value;
  const children = props.children;
  const icon = props.icon;
  const hint = props.hint;
  const className = props.className;
  const labelClassName = props.labelClassName;
  const valueClassName = props.valueClassName;
  const mono = props.mono ?? false;
  const variant = props.variant ?? 'card';

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
        <MetadataItemLabel
          label={label}
          labelClassName={labelClassName}
          isStringLabel={isStringLabel}
          className={cn(
            'uppercase tracking-wider text-gray-500 shrink-0 leading-none',
            isSubtle ? 'font-medium' : 'font-bold'
          )}
          withColon
        />
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
        <MetadataItemLabel
          label={label}
          labelClassName={labelClassName}
          isStringLabel={isStringLabel}
          className='block text-gray-500 text-[10px] uppercase font-bold tracking-wider leading-none'
        />
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
