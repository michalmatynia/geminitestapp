'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import type { MultiSelectOption } from '@/shared/contracts/ui/ui/controls';
import { cn } from '@/shared/utils/ui-utils';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Label } from './label';
import { SearchInput } from './search-input';

export type { MultiSelectOption };

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

export const filterMultiSelectOptions = (
  options: ReadonlyArray<MultiSelectOption>,
  query: string
): ReadonlyArray<MultiSelectOption> => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }

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

  if (args.single) {
    return args.selectedLabels[0] ?? `${args.selected.length} selected`;
  }

  if (args.selectedLabels.length === 0) {
    return `${args.selected.length} selected`;
  }

  if (args.selectedLabels.length <= 2) {
    return args.selectedLabels.join(', ');
  }

  return `${args.selectedLabels.slice(0, 2).join(', ')} +${args.selectedLabels.length - 2}`;
};

const buildMultiSelectOptionProps = (
  option: MultiSelectOption
): { disabled?: boolean | undefined } =>
  option.disabled !== undefined ? { disabled: option.disabled } : {};

export function MultiSelect(props: MultiSelectProps) {
  const {
    options,
    selected,
    onChange,
    ariaLabel,
    placeholder = 'Select options...',
    searchPlaceholder = 'Search...',
    label,
    disabled = false,
    className,
    loading = false,
    emptyMessage = 'No options found.',
    single = false,
  } = props;

  const fieldId = React.useId().replace(/:/g, '');
  const labelId = label ? `multi-select-label-${fieldId}` : undefined;

  const [query, setQuery] = React.useState('');

  const filteredOptions = React.useMemo(() => filterMultiSelectOptions(options, query), [options, query]);

  const toggleOption = React.useCallback(
    (value: string): void => {
      onChange(
        toggleMultiSelectValue({
          selected,
          value,
          single,
        })
      );
    },
    [onChange, selected, single]
  );

  const selectedLabels = React.useMemo(() => resolveSelectedLabels(options, selected), [options, selected]);

  const displayValue = React.useMemo(
    (): string =>
      formatMultiSelectDisplayValue({
        placeholder,
        selected,
        selectedLabels,
        single,
      }),
    [placeholder, selected, selectedLabels, single]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label id={labelId}>{label}</Label>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            className='w-full justify-between text-left font-normal'
            disabled={disabled || loading}
            aria-label={labelId ? undefined : ariaLabel}
            aria-labelledby={labelId}
          >
            <span className='truncate'>{loading ? 'Loading...' : displayValue}</span>
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-64' align='start'>
          <div className='border-b px-2 py-2'>
            <SearchInput
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              variant='subtle'
              size='xs'
              className='h-8'
            />
          </div>
          <div className='max-h-64 overflow-y-auto p-1'>
            {loading ? (
              <div className='p-2 text-center text-sm text-muted-foreground'>Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <div className='p-2 text-center text-sm text-muted-foreground'>{emptyMessage}</div>
            ) : (
              filteredOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                  {...buildMultiSelectOptionProps(option)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
