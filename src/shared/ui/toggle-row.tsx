'use client';

import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

import { Card } from './card';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Switch } from './switch';
import { StatusToggle } from './status-toggle';

interface ToggleRowProps {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  type?: 'checkbox' | 'switch' | 'status';
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  id?: string;
  children?: ReactNode;
  enabledLabel?: string;
  disabledLabel?: string;
  enabledVariant?: 'emerald' | 'cyan' | 'blue';
  disabledVariant?: 'red' | 'slate' | 'gray';
  controlWrapper?: (control: ReactNode) => ReactNode;
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
  enabledLabel,
  disabledLabel,
  enabledVariant,
  disabledVariant,
  controlWrapper,
}: ToggleRowProps): React.JSX.Element {
  const generatedId = id || React.useId();

  const renderControl = () => {
    let control: ReactNode;
    if (type === 'switch') {
      control = (
        <Switch
          id={generatedId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      );
    } else if (type === 'status') {
      control = (
        <StatusToggle
          enabled={checked}
          onToggle={onCheckedChange}
          disabled={disabled}
          enabledLabel={enabledLabel}
          disabledLabel={disabledLabel}
          enabledVariant={enabledVariant}
          disabledVariant={disabledVariant}
        />
      );
    } else {
      control = (
        <Checkbox
          id={generatedId}
          checked={checked}
          onCheckedChange={(val: boolean | 'indeterminate') => onCheckedChange(val === true)}
          disabled={disabled}
        />
      );
    }

    return controlWrapper ? controlWrapper(control) : control;
  };

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
      <div className='relative z-10 flex-1 space-y-0.5'>
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
      {renderControl()}
    </Card>
  );
}
