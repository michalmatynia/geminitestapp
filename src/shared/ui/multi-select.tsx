'use client';

import * as React from 'react';

import type { MultiSelectOption } from '@/shared/contracts/ui/controls';
import { cn } from '@/shared/utils/ui-utils';

import { DropdownMenu, DropdownMenuTrigger } from './dropdown-menu';
import { Label } from './label';
import {
  filterMultiSelectOptions,
  formatMultiSelectDisplayValue,
  MultiSelectDropdownPanel,
  renderMultiSelectTriggerButton,
  resolveMultiSelectLabelId,
  resolveMultiSelectTriggerLabel,
  toggleMultiSelectValue,
  useMultiSelectRuntime,
} from './multi-select.helpers';

export type { MultiSelectOption };
export { filterMultiSelectOptions, formatMultiSelectDisplayValue, toggleMultiSelectValue };

interface MultiSelectProps {
  options: ReadonlyArray<MultiSelectOption>;
  selected: string[];
  onChange: (values: string[]) => void;
  ariaLabel?: string | undefined;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  label?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  loading?: boolean | undefined;
  emptyMessage?: string | undefined;
  single?: boolean | undefined;
}

type NormalizedMultiSelectProps = Omit<
  MultiSelectProps,
  'placeholder' | 'searchPlaceholder' | 'disabled' | 'loading' | 'emptyMessage' | 'single'
> & {
  placeholder: string;
  searchPlaceholder: string;
  disabled: boolean;
  loading: boolean;
  emptyMessage: string;
  single: boolean;
};

const normalizeMultiSelectProps = (props: MultiSelectProps): NormalizedMultiSelectProps => ({
  ...props,
  placeholder: props.placeholder ?? 'Select options...',
  searchPlaceholder: props.searchPlaceholder ?? 'Search...',
  disabled: props.disabled ?? false,
  loading: props.loading ?? false,
  emptyMessage: props.emptyMessage ?? 'No options found.',
  single: props.single ?? false,
});

export function MultiSelect(props: MultiSelectProps): React.JSX.Element {
  const {
    options,
    selected,
    onChange,
    ariaLabel,
    placeholder,
    searchPlaceholder,
    label,
    disabled,
    className,
    loading,
    emptyMessage,
    single,
  } = normalizeMultiSelectProps(props);

  const fieldId = React.useId().replace(/:/g, '');
  const labelId = resolveMultiSelectLabelId({ label, fieldId });
  const triggerLabel = resolveMultiSelectTriggerLabel({ labelId, ariaLabel });
  const { open, setOpen, query, setQuery, filteredOptions, toggleOption, triggerText } =
    useMultiSelectRuntime({ options, selected, onChange, placeholder, single, loading });

  return (
    <div className={cn('space-y-2', className)}>
      {labelId !== undefined ? <Label id={labelId}>{label}</Label> : null}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {renderMultiSelectTriggerButton({
            disabled,
            loading,
            triggerLabel,
            labelId,
            triggerText,
          })}
        </DropdownMenuTrigger>
        <MultiSelectDropdownPanel
          searchPlaceholder={searchPlaceholder}
          query={query}
          setQuery={setQuery}
          filteredOptions={filteredOptions}
          selected={selected}
          loading={loading}
          emptyMessage={emptyMessage}
          single={single}
          toggleOption={toggleOption}
        />
      </DropdownMenu>
    </div>
  );
}
