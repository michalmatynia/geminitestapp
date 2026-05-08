'use client';

import * as React from 'react';

import type { SegmentedControlOption, SegmentedControlProps } from '@/shared/contracts/ui/controls';
import { getTextContent, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/shared/utils/a11y';
import { cn } from '@/shared/utils/ui-utils';

export type { SegmentedControlOption, SegmentedControlProps };

const SIZE_STYLES = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
} as const;

const selectedOptionIndex = <T extends string>(
  options: ReadonlyArray<SegmentedControlOption<T>>,
  value: T
): number => {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
};

const nextOptionIndexForKey = (
  key: string,
  selectedIndex: number,
  optionCount: number
): number | null => {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (selectedIndex + 1) % optionCount;
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (selectedIndex - 1 + optionCount) % optionCount;
  }
  if (key === 'Home') return 0;
  if (key === 'End') return optionCount - 1;
  return null;
};

const useSegmentedControlLabel = (input: {
  ariaLabel?: string;
  ariaLabelledBy?: string;
}): string | undefined => {
  const hasConfiguredLabel =
    (input.ariaLabel?.trim().length ?? 0) > 0 || (input.ariaLabelledBy?.trim().length ?? 0) > 0;
  const { ariaLabel: resolvedGroupLabel, hasAccessibleLabel } = resolveAccessibleLabel({
    children: null,
    ariaLabel: input.ariaLabel,
    ariaLabelledBy: input.ariaLabelledBy,
    fallbackLabel: hasConfiguredLabel ? undefined : 'Selection options',
  });

  if (!hasAccessibleLabel) {
    warnMissingAccessibleLabel({
      componentName: 'SegmentedControl',
      hasAccessibleLabel,
    });
  }

  return resolvedGroupLabel;
};

type SegmentedControlButtonProps<T extends string> = {
  activeClassName?: string;
  disabled: boolean;
  index: number;
  isActive: boolean;
  itemClassName?: string;
  onChange: (value: T) => void;
  option: SegmentedControlOption<T>;
  selectedIndex: number;
  setOptionRef: (index: number, node: HTMLButtonElement | null) => void;
  size: NonNullable<SegmentedControlProps<T>['size']>;
};

const resolveOptionLabel = <T extends string>(option: SegmentedControlOption<T>): string => {
  if (option.ariaLabel !== undefined) return option.ariaLabel;
  const derivedLabel = getTextContent(option.label).trim();
  return derivedLabel.length > 0 ? derivedLabel : option.value;
};

const segmentedButtonClassName = <T extends string>({
  activeClassName,
  disabled,
  isActive,
  itemClassName,
  size,
}: Pick<
  SegmentedControlButtonProps<T>,
  'activeClassName' | 'disabled' | 'isActive' | 'itemClassName' | 'size'
>): string =>
  cn(
    'flex items-center gap-1.5 rounded font-medium transition-all duration-200',
    SIZE_STYLES[size],
    isActive
      ? cn('bg-cyan-500/20 text-cyan-200 shadow-sm', activeClassName)
      : cn('text-gray-400 hover:text-gray-200 hover:bg-white/5', itemClassName),
    disabled ? 'cursor-not-allowed opacity-60' : undefined
  );

function SegmentedControlButton<T extends string>({
  activeClassName,
  disabled,
  index,
  isActive,
  itemClassName,
  onChange,
  option,
  selectedIndex,
  setOptionRef,
  size,
}: SegmentedControlButtonProps<T>): React.JSX.Element {
  const Icon = option.icon;
  const resolvedOptionLabel = resolveOptionLabel(option);

  return (
    <button
      type='button'
      onClick={() => {
        if (!disabled) onChange(option.value);
      }}
      role='radio'
      aria-checked={isActive}
      aria-label={resolvedOptionLabel}
      disabled={disabled}
      tabIndex={!disabled && index === selectedIndex ? 0 : -1}
      ref={(node) => {
        setOptionRef(index, node);
      }}
      className={segmentedButtonClassName({
        activeClassName,
        disabled,
        isActive,
        itemClassName,
        size,
      })}
    >
      {Icon ? <Icon className='size-3' aria-hidden='true' /> : null}
      {option.label}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  activeClassName,
  ariaLabel,
  ariaLabelledBy,
  className,
  disabled = false,
  itemClassName,
  onChange,
  options,
  size = 'sm',
  value,
}: SegmentedControlProps<T>): React.JSX.Element {
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = React.useMemo(() => selectedOptionIndex(options, value), [options, value]);
  const resolvedGroupLabel = useSegmentedControlLabel({ ariaLabel, ariaLabelledBy });
  const setOptionRef = React.useCallback((index: number, node: HTMLButtonElement | null): void => {
    optionRefs.current[index] = node;
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled || options.length === 0) return;
    const nextIndex = nextOptionIndexForKey(event.key, selectedIndex, options.length);
    if (nextIndex === null) return;

    event.preventDefault();
    const nextValue = options[nextIndex]?.value;
    if (nextValue === undefined) return;
    onChange(nextValue);
    requestAnimationFrame(() => {
      optionRefs.current[nextIndex]?.focus();
    });
  };

  return (
    <div
      role='radiogroup'
      aria-label={resolvedGroupLabel}
      aria-labelledby={ariaLabelledBy}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      className={cn('flex items-center rounded-md border border-border/60 bg-card/40 p-0.5', className)}
    >
      {options.map((option, index) => (
        <SegmentedControlButton
          key={option.value}
          activeClassName={activeClassName}
          disabled={disabled}
          index={index}
          isActive={value === option.value}
          itemClassName={itemClassName}
          onChange={onChange}
          option={option}
          selectedIndex={selectedIndex}
          setOptionRef={setOptionRef}
          size={size}
        />
      ))}
    </div>
  );
}
