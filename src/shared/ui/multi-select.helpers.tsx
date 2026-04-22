'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import type { MultiSelectOption } from '@/shared/contracts/ui/controls';

import { Button } from './button';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
} from './dropdown-menu';
import { SearchInput } from './search-input';

export const filterMultiSelectOptions = (
  options: ReadonlyArray<MultiSelectOption>,
  query: string
): ReadonlyArray<MultiSelectOption> => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return options;
  return options.filter((option) => option.label.toLowerCase().includes(normalized));
};

export const toggleMultiSelectValue = (args: {
  selected: string[];
  value: string;
  single: boolean;
}): string[] => {
  if (args.single) {
    return args.selected.includes(args.value) ? [] : [args.value];
  }

  return args.selected.includes(args.value)
    ? args.selected.filter((selectedValue) => selectedValue !== args.value)
    : [...args.selected, args.value];
};

const resolveSelectedLabels = (
  options: ReadonlyArray<MultiSelectOption>,
  selected: string[]
): string[] => options.filter((option) => selected.includes(option.value)).map((option) => option.label);

export const formatMultiSelectDisplayValue = (args: {
  placeholder: string;
  selected: string[];
  selectedLabels: string[];
  single: boolean;
}): string => {
  if (args.selected.length === 0) return args.placeholder;
  if (args.single) return args.selectedLabels[0] ?? `${args.selected.length} selected`;
  if (args.selectedLabels.length === 0) return `${args.selected.length} selected`;
  if (args.selectedLabels.length <= 2) return args.selectedLabels.join(', ');
  return `${args.selectedLabels.slice(0, 2).join(', ')} +${args.selectedLabels.length - 2}`;
};

const buildMultiSelectOptionProps = (
  option: MultiSelectOption
): { disabled?: boolean | undefined } =>
  option.disabled !== undefined ? { disabled: option.disabled } : {};

const hasTextValue = (value: string | undefined): value is string => value !== undefined && value !== '';

export const resolveMultiSelectLabelId = ({
  label,
  fieldId,
}: {
  label: string | undefined;
  fieldId: string;
}): string | undefined => (hasTextValue(label) ? `multi-select-label-${fieldId}` : undefined);

export const resolveMultiSelectTriggerLabel = ({
  labelId,
  ariaLabel,
}: {
  labelId: string | undefined;
  ariaLabel: string | undefined;
}): string | undefined => (labelId === undefined ? ariaLabel : undefined);

const MultiSelectOptionsContent = ({
  filteredOptions,
  selected,
  loading,
  emptyMessage,
  single,
  toggleOption,
}: {
  filteredOptions: ReadonlyArray<MultiSelectOption>;
  selected: string[];
  loading: boolean;
  emptyMessage: string;
  single: boolean;
  toggleOption: (value: string) => void;
}): React.JSX.Element => {
  if (loading) {
    return <div className='p-2 text-center text-sm text-muted-foreground'>Loading...</div>;
  }

  if (filteredOptions.length === 0) {
    return <div className='p-2 text-center text-sm text-muted-foreground'>{emptyMessage}</div>;
  }

  return (
    <>
      {filteredOptions.map((option) => (
        <DropdownMenuCheckboxItem
          key={option.value}
          checked={selected.includes(option.value)}
          onSelect={(event) => {
            if (!single) event.preventDefault();
          }}
          onCheckedChange={() => toggleOption(option.value)}
          {...buildMultiSelectOptionProps(option)}
        >
          {option.label}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
};

export const renderMultiSelectTriggerButton = ({
  disabled,
  loading,
  triggerLabel,
  labelId,
  triggerText,
}: {
  disabled: boolean;
  loading: boolean;
  triggerLabel: string | undefined;
  labelId: string | undefined;
  triggerText: string;
}): React.JSX.Element => (
  <Button
    variant='outline'
    className='w-full justify-between text-left font-normal'
    disabled={disabled || loading}
    aria-label={triggerLabel}
    aria-labelledby={labelId}
    aria-haspopup='menu'
    aria-live='polite'
  >
    <span className='truncate'>{triggerText}</span>
    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
  </Button>
);

export const MultiSelectDropdownPanel = ({
  searchPlaceholder,
  query,
  setQuery,
  filteredOptions,
  selected,
  loading,
  emptyMessage,
  single,
  toggleOption,
}: {
  searchPlaceholder: string;
  query: string;
  setQuery: (value: string) => void;
  filteredOptions: ReadonlyArray<MultiSelectOption>;
  selected: string[];
  loading: boolean;
  emptyMessage: string;
  single: boolean;
  toggleOption: (value: string) => void;
}): React.JSX.Element => (
  <DropdownMenuContent className='w-64' align='start'>
    <div className='border-b px-2 py-2'>
      <SearchInput
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery('')}
        variant='subtle'
        size='xs'
        className='h-8'
      />
    </div>
    <div className='max-h-64 overflow-y-auto p-1'>
      <MultiSelectOptionsContent
        filteredOptions={filteredOptions}
        selected={selected}
        loading={loading}
        emptyMessage={emptyMessage}
        single={single}
        toggleOption={toggleOption}
      />
    </div>
  </DropdownMenuContent>
);

export type MultiSelectRuntime = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  filteredOptions: ReadonlyArray<MultiSelectOption>;
  toggleOption: (value: string) => void;
  triggerText: string;
};

export const useMultiSelectRuntime = ({
  options,
  selected,
  onChange,
  placeholder,
  single,
  loading,
}: {
  options: ReadonlyArray<MultiSelectOption>;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  single: boolean;
  loading: boolean;
}): MultiSelectRuntime => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filteredOptions = React.useMemo(() => filterMultiSelectOptions(options, query), [options, query]);
  const toggleOption = React.useCallback(
    (value: string): void => {
      onChange(toggleMultiSelectValue({ selected, value, single }));
      if (single) setOpen(false);
    },
    [onChange, selected, single]
  );
  const selectedLabels = React.useMemo(() => resolveSelectedLabels(options, selected), [options, selected]);
  const displayValue = React.useMemo(
    (): string => formatMultiSelectDisplayValue({ placeholder, selected, selectedLabels, single }),
    [placeholder, selected, selectedLabels, single]
  );

  return { open, setOpen, query, setQuery, filteredOptions, toggleOption, triggerText: loading ? 'Loading...' : displayValue };
};
