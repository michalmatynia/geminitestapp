'use client';

import React from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface ToggleButtonGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  className?: string | undefined;
  size?: 'xs' | 'sm' | 'default' | undefined;
}

export function ToggleButtonGroup<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'sm',
}: ToggleButtonGroupProps<T>): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-1 py-0.5',
        className
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          size={size}
          variant={value === option.value ? 'secondary' : 'ghost'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
