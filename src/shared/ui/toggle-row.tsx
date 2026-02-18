'use client';

import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Checkbox } from './checkbox';
import { Label } from './label';
import { Switch } from './switch';

interface ToggleRowProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  type?: 'checkbox' | 'switch';
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  type = 'checkbox',
  disabled = false,
  className,
  id,
}: ToggleRowProps): React.JSX.Element {
  const generatedId = id || React.useId();
  
  const Control = type === 'switch' ? Switch : Checkbox;

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/30 p-3 transition-colors hover:bg-card/50',
      disabled && 'opacity-50 pointer-events-none',
      className
    )}>
      <div className='flex-1 space-y-0.5'>
        <Label 
          htmlFor={generatedId}
          className='text-sm font-medium text-gray-200 cursor-pointer'
        >
          {label}
        </Label>
        {description && (
          <p className='text-[11px] text-gray-500 leading-tight'>
            {description}
          </p>
        )}
      </div>
      <Control
        id={generatedId}
        checked={checked}
        onCheckedChange={(val: boolean | 'indeterminate') => onCheckedChange(type === 'switch' ? Boolean(val) : val === true)}
        disabled={disabled}
      />
    </div>
  );
}
