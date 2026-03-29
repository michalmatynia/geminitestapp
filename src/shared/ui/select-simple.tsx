'use client';

import React from 'react';

import type { SelectSimpleOption } from '@/shared/contracts/ui';
import { cn, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/shared/utils';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select';

export type { SelectSimpleOption };

interface SelectSimpleProps {
  value: string | undefined;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
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
  title?: string | undefined;
  size?: 'default' | 'sm' | 'xs';
  variant?: 'default' | 'subtle';
  dataDocId?: string | undefined;
  dataDocAlias?: string | undefined;
}

type SelectSimpleGroupedOptions = {
  groups: Array<{ key: string; label: string | null; options: SelectSimpleOption[] }>;
  hasVisibleGroupLabels: boolean;
};

const toOptionArray = <T,>(option: T): T[] => [option];

type SelectSimpleRenderProps = {
  ariaDescribedBy: string | undefined;
  ariaErrorMessage: string | undefined;
  ariaInvalid: boolean | undefined;
  className: string | undefined;
  contentClassName: string | undefined;
  dataDocAlias: string | undefined;
  dataDocId: string | undefined;
  disabled: boolean;
  groupedOptions: SelectSimpleGroupedOptions;
  id: string | undefined;
  onValueChange: (value: string) => void;
  placeholder: string;
  resolvedTitle: string;
  resolvedTriggerAriaLabel: string | undefined;
  safeValue: string;
  size: 'default' | 'sm' | 'xs';
  triggerClassName: string | undefined;
  variant: 'default' | 'subtle';
};

const renderSelectSimpleOptions = ({
  groupedOptions,
}: Pick<SelectSimpleRenderProps, 'groupedOptions'>): React.ReactNode =>
  groupedOptions.groups.map((group) => (
    <SelectGroup key={group.key}>
      {groupedOptions.hasVisibleGroupLabels && group.label ? (
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
  ));

const renderSelectSimple = ({
  ariaDescribedBy,
  ariaErrorMessage,
  ariaInvalid,
  className,
  contentClassName,
  dataDocAlias,
  dataDocId,
  disabled,
  groupedOptions,
  id,
  onValueChange,
  placeholder,
  resolvedTitle,
  resolvedTriggerAriaLabel,
  safeValue,
  size,
  triggerClassName,
  variant,
}: SelectSimpleRenderProps): React.JSX.Element => (
  <div className={cn('w-full', className)}>
    <Select value={safeValue} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className={cn(
          'w-full [&>span]:max-w-[calc(100%-1.5rem)] [&>span]:truncate [&>span]:text-left',
          size === 'sm' && 'h-8 text-xs',
          size === 'xs' && 'h-7 text-[10px]',
          variant === 'subtle' &&
            'border-border/40 bg-card/40 hover:bg-card/60 hover:border-border/60',
          triggerClassName
        )}
        aria-label={resolvedTriggerAriaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || undefined}
        aria-errormessage={ariaErrorMessage}
        title={resolvedTitle}
        data-doc-id={dataDocId}
        data-doc-alias={dataDocAlias}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position='popper'
        className={cn(
          'min-w-[var(--radix-select-trigger-width)] max-w-[min(34rem,calc(100vw-2rem))]',
          contentClassName
        )}
      >
        {renderSelectSimpleOptions({ groupedOptions })}
      </SelectContent>
    </Select>
  </div>
);

export function SelectSimple(props: SelectSimpleProps): React.JSX.Element {
  const {
    value,
    onValueChange,
    onChange,
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
    title,
    size = 'default',
    variant = 'default',
    dataDocId,
    dataDocAlias,
  } = props;
  const handleValueChange = React.useCallback(
    (nextValue: string): void => {
      onValueChange?.(nextValue);
      onChange?.(nextValue);
    },
    [onChange, onValueChange]
  );

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
        options: toOptionArray(option),
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
  const resolvedTitle = React.useMemo(() => {
    if (title?.trim()) {
      return title.trim();
    }
    return resolvedAriaLabel;
  }, [resolvedAriaLabel, title]);
  const allowFallbackLabel = !id;
  const {
    ariaLabel: resolvedTriggerAriaLabel,
    hasAccessibleLabel,
  } = React.useMemo(
    () =>
      resolveAccessibleLabel({
        children: null,
        ariaLabel: resolvedAriaLabel,
        ariaLabelledBy: undefined,
        title: allowFallbackLabel ? resolvedTitle : undefined,
        fallbackLabel: allowFallbackLabel
          ? placeholder ?? dataDocAlias ?? dataDocId
          : undefined,
      }),
    [allowFallbackLabel, dataDocAlias, dataDocId, placeholder, resolvedAriaLabel, resolvedTitle]
  );
  const hasLabel = hasAccessibleLabel || Boolean(id);
  if (!hasLabel) {
    warnMissingAccessibleLabel({ componentName: 'SelectSimple', hasAccessibleLabel: hasLabel });
  }

  return renderSelectSimple({
    ariaDescribedBy,
    ariaErrorMessage,
    ariaInvalid,
    className,
    contentClassName,
    dataDocAlias,
    dataDocId,
      disabled,
      groupedOptions,
      id,
      onValueChange: handleValueChange,
      placeholder,
    resolvedTitle,
    resolvedTriggerAriaLabel,
    safeValue,
    size,
    triggerClassName,
    variant,
  });
}
