'use client';

import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Card } from './card';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Switch } from './switch';

interface ToggleRowProps {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  type?: 'checkbox' | 'switch';
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  id?: string;
  children?: ReactNode;
}

export function ToggleRow({
  label,
  description,
  icon,
  checked,
  onCheckedChange,
  type = 'checkbox',
  disabled = false,
  className,
  labelClassName,
  id,
  children,
}: ToggleRowProps): React.JSX.Element {
  const generatedId = id || React.useId();

  const Control = type === 'switch' ? Switch : Checkbox;

  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className={cn(
        'flex flex-row items-center justify-between gap-4 transition-colors hover:bg-card/50 bg-card/30',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {children}
      <div id={id} className='relative z-10 flex-1 space-y-0.5'>
        <div className='flex items-center gap-1.5'>
          {icon ? <span className='shrink-0'>{icon}</span> : null}
          <Label
            htmlFor={generatedId}
            className={cn('text-sm font-medium text-gray-200 cursor-pointer', labelClassName)}
          >
            {label}
          </Label>
        </div>
        {description && <p className='text-[11px] text-gray-500 leading-tight'>{description}</p>}
      </div>
      <Control
        id={generatedId}
        checked={checked}
        onCheckedChange={(val: boolean | 'indeterminate') =>
          onCheckedChange(type === 'switch' ? Boolean(val) : val === true)
        }
        disabled={disabled}
      />
    </Card>
  );
}
