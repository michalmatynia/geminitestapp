'use client';

import { Search, X } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';


import { Button } from '@/shared/ui';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/utils/ui-utils';

import { FilterField } from './types';

const isActiveFilterValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const getSingleSelectValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const firstValue = (value as unknown[])[0];
    if (typeof firstValue === 'string') return firstValue;
    if (typeof firstValue === 'number') return String(firstValue);
    return '';
  }
  return '';
};

const getMultiSelectValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string | number => typeof entry === 'string' || typeof entry === 'number')
      .map(String);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value);
    return normalized ? [normalized] : [];
  }
  return [];
};

interface PanelFiltersProps {
  filters: FilterField[];
  values: Record<string, unknown>;
  search?: string;
  searchPlaceholder?: string;
  onFilterChange: (key: string, value: unknown) => void;
  onSearchChange?: (search: string) => void;
  onReset?: () => void;
  compact?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * PanelFilters - Renders dynamic filter controls based on FilterField configuration
 * Supports: text input, select dropdown, date input, checkbox, number input
 */
export const PanelFilters: React.FC<PanelFiltersProps> = ({
  filters,
  values,
  search: externalSearch = '',
  searchPlaceholder = 'Search...',
  onFilterChange,
  onSearchChange,
  onReset,
  compact = false,
  collapsible = false,
  defaultExpanded,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? !compact);
  const [localSearch, setLocalSearch] = useState(externalSearch);

  // Sync local search with external search (e.g. on reset)
  useEffect(() => {
    setLocalSearch(externalSearch);
  }, [externalSearch]);

  // Debounce search changes
  useEffect(() => {
    if (localSearch === externalSearch) return;
    
    const timer = setTimeout(() => {
      onSearchChange?.(localSearch);
    }, 400);

    return () => clearTimeout(timer);
  }, [localSearch, externalSearch, onSearchChange]);

  const handleReset = useCallback(() => {
    onReset?.();
    setLocalSearch('');
    setIsExpanded(false);
  }, [onReset]);

  const hasActiveFilters = Object.values(values).some((value) => isActiveFilterValue(value));
  const activeFilterCount = Object.values(values).filter((value) => isActiveFilterValue(value)).length;

  const filterFieldsToRender = filters.filter((f) => f.type !== 'text');

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      {searchPlaceholder && (
        <div className='relative'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-gray-400' />
          <Input
            type='text'
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className='pl-8 pr-8'
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange?.('');
              }}
              className='absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600'
              aria-label='Clear search'
            >
              <X className='h-4 w-4' />
            </button>
          )}
        </div>
      )}

      {/* Filter Controls */}
      {filterFieldsToRender.length > 0 && (
        <>
          {/* Toggle button (compact or explicit collapsible mode) */}
          {compact || collapsible ? (
            <Button
              type='button'
              size='xs'
              variant={hasActiveFilters ? 'default' : 'outline'}
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'h-8 px-2',
                hasActiveFilters && 'bg-blue-600 text-white hover:bg-blue-500'
              )}
            >
              {isExpanded ? 'Hide Filters' : 'Show Filters'}
              {hasActiveFilters && <span> ({activeFilterCount})</span>}
            </Button>
          ) : null}

          {isExpanded && (
            <div className='flex flex-wrap gap-2'>
              {filterFieldsToRender.map((field) => (
                <FilterControl
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) => onFilterChange(field.key, value)}
                />
              ))}

              {/* Reset Button */}
              {hasActiveFilters && (
                <Button
                  type='button'
                  variant='outline'
                  size='xs'
                  onClick={handleReset}
                  className='ml-auto'
                >
                  Reset Filters
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface FilterControlProps {
  field: FilterField;
  value: unknown;
  onChange: (value: unknown) => void;
}

/**
 * FilterControl - Renders individual filter input based on field type
 */
const FilterControl: React.FC<FilterControlProps> = ({ field, value, onChange }) => {
  const containerStyle: React.CSSProperties = {
    ...(field.width ? { width: field.width } : {}),
  };

  switch (field.type) {
    case 'select': {
      const options = (field.options ?? []).map((option) => ({
        value: String(option.value),
        label: option.label,
      }));

      if (field.multi) {
        return (
          <div style={containerStyle} className='flex flex-col gap-1'>
            <label className='text-xs font-medium text-gray-600'>{field.label}</label>
            <MultiSelect
              options={options}
              selected={getMultiSelectValues(value)}
              onChange={(selectedValues) => onChange(selectedValues)}
              placeholder={field.placeholder ?? 'Select options...'}
              className='w-full'
            />
          </div>
        );
      }

      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <Select value={getSingleSelectValue(value)} onValueChange={(val) => onChange(val)}>
            <SelectTrigger className='h-8' aria-label={field.label}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case 'checkbox':
      return (
        <div style={containerStyle} className='flex items-center gap-2 py-1'>
          <Checkbox
            id={field.key}
            checked={(value as boolean) || false}
            onCheckedChange={onChange}
          />
          <label htmlFor={field.key} className='text-sm font-medium cursor-pointer'>
            {field.label}
          </label>
        </div>
      );

    case 'number':
      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <Input
            type='number'
            placeholder={field.placeholder}
            value={(value as string | number) || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            className='h-8 text-sm'
          />
        </div>
      );

    case 'date':
      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <Input
            type='date'
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className='h-8 text-sm'
          />
        </div>
      );

    case 'dateRange': {
      const rangeValue = value as { from?: string; to?: string } | undefined;
      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <div className='flex gap-1'>
            <Input
              type='date'
              placeholder='From'
              value={rangeValue?.from || ''}
              onChange={(e) =>
                onChange({
                  ...(rangeValue || {}),
                  from: e.target.value || undefined,
                })
              }
              className='h-8 text-sm'
            />
            <Input
              type='date'
              placeholder='To'
              value={rangeValue?.to || ''}
              onChange={(e) =>
                onChange({
                  ...(rangeValue || {}),
                  to: e.target.value || undefined,
                })
              }
              className='h-8 text-sm'
            />
          </div>
        </div>
      );
    }

    case 'text':
    default:
      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <Input
            type='text'
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className='h-8 text-sm'
          />
        </div>
      );
  }
};

PanelFilters.displayName = 'PanelFilters';
