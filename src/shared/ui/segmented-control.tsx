'use client';

import * as React from 'react';

import { cn, getTextContent, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/shared/utils';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  itemClassName,
  activeClassName,
  size = 'sm',
  ariaLabel,
  ariaLabelledBy,
}: SegmentedControlProps<T>): React.JSX.Element {
  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
  };
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = React.useMemo(() => {
    const index = options.findIndex((option) => option.value === value);
    return index >= 0 ? index : 0;
  }, [options, value]);

  const focusOption = (index: number) => {
    optionRefs.current[index]?.focus();
  };

  const allowFallbackLabel = !ariaLabel && !ariaLabelledBy;
  const { ariaLabel: resolvedGroupLabel, hasAccessibleLabel: hasGroupLabel } =
    resolveAccessibleLabel({
    children: null,
    ariaLabel,
    ariaLabelledBy,
    fallbackLabel: allowFallbackLabel ? 'Selection options' : undefined,
  });
  if (!hasGroupLabel) {
    warnMissingAccessibleLabel({
      componentName: 'SegmentedControl',
      hasAccessibleLabel: hasGroupLabel,
    });
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;

    const key = event.key;
    let nextIndex = selectedIndex;

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = (selectedIndex + 1) % options.length;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = (selectedIndex - 1 + options.length) % options.length;
    } else if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = options.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextValue = options[nextIndex]?.value;
    if (nextValue === undefined) return;
    onChange(nextValue);
    requestAnimationFrame(() => focusOption(nextIndex));
  };

  return (
    <div
      role='radiogroup'
      aria-label={resolvedGroupLabel}
      aria-labelledby={ariaLabelledBy}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center rounded-md border border-border/60 bg-card/40 p-0.5',
        className
      )}
    >
      {options.map((option, index) => {
        const isActive = value === option.value;
        const Icon = option.icon;
        const derivedLabel = getTextContent(option.label).trim();
        const resolvedOptionLabel =
          option.ariaLabel ?? (derivedLabel || undefined) ?? option.value;

        return (
          <button
            key={option.value}
            type='button'
            onClick={() => onChange(option.value)}
            role='radio'
            aria-checked={isActive}
            aria-label={resolvedOptionLabel}
            tabIndex={index === selectedIndex ? 0 : -1}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            className={cn(
              'flex items-center gap-1.5 rounded font-medium transition-all duration-200',
              sizeStyles[size],
              isActive
                ? cn('bg-cyan-500/20 text-cyan-200 shadow-sm', activeClassName)
                : cn('text-gray-400 hover:text-gray-200 hover:bg-white/5', itemClassName)
            )}
          >
            {Icon && <Icon className='size-3' aria-hidden='true' />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
