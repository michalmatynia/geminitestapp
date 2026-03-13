'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select';

export interface SelectSimpleOption {
  value: string;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
  group?: string | undefined;
}

interface SelectSimpleProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectSimpleOption[] | readonly SelectSimpleOption[];
  placeholder?: string | undefined;
  className?: string | undefined;
  triggerClassName?: string | undefined;
  contentClassName?: string | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  ariaLabel?: string | undefined;
  ariaDescribedBy?: string | undefined;
  ariaInvalid?: boolean | undefined;
  ariaErrorMessage?: string | undefined;
  size?: 'default' | 'sm' | 'xs';
  variant?: 'default' | 'subtle';
  dataDocId?: string | undefined;
  dataDocAlias?: string | undefined;
}

type SelectSimpleGroupedOptions = {
  groups: Array<{ key: string; label: string | null; options: SelectSimpleOption[] }>;
  hasVisibleGroupLabels: boolean;
};

type SelectSimpleRuntimeValue = {
  safeValue: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  triggerClassName?: string | undefined;
  contentClassName?: string | undefined;
  id?: string | undefined;
  ariaLabel?: string | undefined;
  ariaDescribedBy?: string | undefined;
  ariaInvalid?: boolean | undefined;
  ariaErrorMessage?: string | undefined;
  size: 'default' | 'sm' | 'xs';
  variant: 'default' | 'subtle';
  dataDocId?: string | undefined;
  dataDocAlias?: string | undefined;
  groupedOptions: SelectSimpleGroupedOptions;
};

const { Context: SelectSimpleRuntimeContext, useStrictContext: useSelectSimpleRuntime } =
  createStrictContext<SelectSimpleRuntimeValue>({
    hookName: 'useSelectSimpleRuntime',
    providerName: 'SelectSimpleRuntimeProvider',
    displayName: 'SelectSimpleRuntimeContext',
  });

function SelectSimpleControl(): React.JSX.Element {
  const runtime = useSelectSimpleRuntime();

  return (
    <Select
      value={runtime.safeValue}
      onValueChange={runtime.onValueChange}
      disabled={runtime.disabled}
    >
      <SelectTrigger
        id={runtime.id}
        className={cn(
          'w-full [&>span]:max-w-[calc(100%-1.5rem)] [&>span]:truncate [&>span]:text-left',
          runtime.size === 'sm' && 'h-8 text-xs',
          runtime.size === 'xs' && 'h-7 text-[10px]',
          runtime.variant === 'subtle' &&
            'border-border/40 bg-card/40 hover:bg-card/60 hover:border-border/60',
          runtime.triggerClassName
        )}
        aria-label={runtime.ariaLabel}
        aria-describedby={runtime.ariaDescribedBy}
        aria-invalid={runtime.ariaInvalid || undefined}
        aria-errormessage={runtime.ariaErrorMessage}
        data-doc-id={runtime.dataDocId}
        data-doc-alias={runtime.dataDocAlias}
      >
        <SelectValue placeholder={runtime.placeholder} />
      </SelectTrigger>
      <SelectContent
        position='popper'
        className={cn(
          'min-w-[var(--radix-select-trigger-width)] max-w-[min(34rem,calc(100vw-2rem))]',
          runtime.contentClassName
        )}
      >
        {runtime.groupedOptions.groups.map((group) => (
          <SelectGroup key={group.key}>
            {runtime.groupedOptions.hasVisibleGroupLabels && group.label ? (
              <SelectLabel className='px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
                {group.label}
              </SelectLabel>
            ) : null}
            {group.options.map((option) => (
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
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
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
  id,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  ariaErrorMessage,
  size = 'default',
  variant = 'default',
  dataDocId,
  dataDocAlias,
}: SelectSimpleProps): React.JSX.Element {
  const normalizedOptions = React.useMemo(
    () => options.filter((option) => option.value && option.value.trim() !== ''),
    [options]
  );
  const groupedOptions = React.useMemo<SelectSimpleGroupedOptions>(() => {
    const groups: Array<{ key: string; label: string | null; options: SelectSimpleOption[] }> = [];
    const indexByKey = new Map<string, number>();
    normalizedOptions.forEach((option) => {
      const trimmedGroup = option.group?.trim() ?? '';
      const groupKey = trimmedGroup || '__ungrouped__';
      const existingIndex = indexByKey.get(groupKey);
      if (existingIndex !== undefined) {
        groups[existingIndex]?.options.push(option);
        return;
      }
      indexByKey.set(groupKey, groups.length);
      groups.push({
        key: groupKey,
        label: trimmedGroup || null,
        options: [option],
      });
    });
    const hasVisibleGroupLabels = groups.some((group) => group.label !== null);
    return {
      groups,
      hasVisibleGroupLabels,
    };
  }, [normalizedOptions]);
  const hasValue =
    value !== undefined && normalizedOptions.some((option) => option.value === value);
  const safeValue = hasValue && typeof value === 'string' ? value : '';
  const resolvedAriaLabel = React.useMemo(() => {
    if (ariaLabel?.trim()) {
      return ariaLabel.trim();
    }
    if (placeholder.trim()) {
      return placeholder.trim();
    }
    return 'Select option';
  }, [ariaLabel, placeholder]);
  const runtimeValue = React.useMemo<SelectSimpleRuntimeValue>(
    () => ({
      safeValue,
      onValueChange,
      disabled,
      placeholder,
      triggerClassName,
      contentClassName,
      id,
      ariaLabel: resolvedAriaLabel,
      ariaDescribedBy,
      ariaInvalid,
      ariaErrorMessage,
      size,
      variant,
      dataDocId,
      dataDocAlias,
      groupedOptions,
    }),
    [
      safeValue,
      onValueChange,
      disabled,
      placeholder,
      triggerClassName,
      contentClassName,
      id,
      resolvedAriaLabel,
      ariaDescribedBy,
      ariaInvalid,
      ariaErrorMessage,
      size,
      variant,
      dataDocId,
      dataDocAlias,
      groupedOptions,
    ]
  );

  return (
    <div className={cn('w-full', className)}>
      <SelectSimpleRuntimeContext.Provider value={runtimeValue}>
        <SelectSimpleControl />
      </SelectSimpleRuntimeContext.Provider>
    </div>
  );
}
