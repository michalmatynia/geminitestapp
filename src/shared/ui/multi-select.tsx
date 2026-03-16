'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Label } from './label';
import { SearchInput } from './search-input';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean | undefined;
}

interface MultiSelectProps {
  options: ReadonlyArray<MultiSelectOption>;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  label?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  loading?: boolean | undefined;
  emptyMessage?: string | undefined;
  single?: boolean | undefined;
}

export function MultiSelect(props: MultiSelectProps) {
  const {
    options,
    selected,
    onChange,
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

  const filteredOptions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const toggleOption = (value: string) => {
    if (single) {
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  };

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label);

  const displayValue = React.useMemo((): string => {
    if (selected.length === 0) return placeholder;

    if (single) {
      return selectedLabels[0] ?? `${selected.length} selected`;
    }

    if (selectedLabels.length === 0) {
      return `${selected.length} selected`;
    }

    if (selectedLabels.length <= 2) {
      return selectedLabels.join(', ');
    }

    return `${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2}`;
  }, [placeholder, selected.length, selectedLabels, single]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label id={labelId}>{label}</Label>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            className='w-full justify-between text-left font-normal'
            disabled={disabled || loading}
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
                  {...(option.disabled !== undefined ? { disabled: option.disabled } : {})}
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
