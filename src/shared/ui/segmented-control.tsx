'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  itemClassName,
  activeClassName,
  size = 'sm',
}: SegmentedControlProps<T>): React.JSX.Element {
  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
  };

  return (
    <div
      role='group'
      className={cn(
        'flex items-center rounded-md border border-border/60 bg-card/40 p-0.5',
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type='button'
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-1.5 rounded font-medium transition-all duration-200',
              sizeStyles[size],
              isActive
                ? cn('bg-cyan-500/20 text-cyan-200 shadow-sm', activeClassName)
                : cn('text-gray-400 hover:text-gray-200 hover:bg-white/5', itemClassName)
            )}
          >
            {Icon && <Icon className='size-3' />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
