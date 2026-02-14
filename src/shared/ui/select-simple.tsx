'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export interface SelectSimpleOption {
  value: string;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}

interface SelectSimpleProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectSimpleOption[];
  placeholder?: string | undefined;
  className?: string | undefined;
  triggerClassName?: string | undefined;
  contentClassName?: string | undefined;
  disabled?: boolean | undefined;
  ariaLabel?: string | undefined;
  size?: 'default' | 'sm';
}

export function SelectSimple({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
  ariaLabel,
  size = 'default',
}: SelectSimpleProps): React.JSX.Element {
  const normalizedOptions = React.useMemo(
    () => options.filter((option) => option.value && option.value.trim() !== ''),
    [options]
  );
  const hasValue = value !== undefined && normalizedOptions.some((option) => option.value === value);
  const safeValue = hasValue && typeof value === 'string' ? value : '';

  return (
    <div className={cn('w-full', className)}>
      <Select
        value={safeValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            'w-full [&>span]:max-w-[calc(100%-1.5rem)] [&>span]:truncate [&>span]:text-left',
            size === 'sm' && 'h-8 text-xs',
            triggerClassName
          )}
          aria-label={ariaLabel}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={cn('max-w-[min(34rem,calc(100vw-2rem))]', contentClassName)}>
          {normalizedOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              {...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
            >
              <div className='flex min-w-0 flex-col'>
                <span className='break-words leading-tight'>{option.label}</span>
                {option.description && (
                  <span className='mt-0.5 break-words text-[10px] leading-tight text-gray-500'>
                    {option.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
