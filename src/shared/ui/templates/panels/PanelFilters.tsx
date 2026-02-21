'use client';

import { Search, X } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';


import { FilterField } from '@/shared/contracts/ui';
import { Button, Label, SelectSimple } from '@/shared/ui';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { cn } from '@/shared/utils/ui-utils';


const isActiveFilterValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some((entry) => isActiveFilterValue(entry));
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      isActiveFilterValue(entry)
    );
  }
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

  const filterFieldsToRender = filters;
  const showToggleButton = filterFieldsToRender.length > 0 && (compact || collapsible);

  return (
    <div className={cn('space-y-3', className)}>
      {(searchPlaceholder || showToggleButton) && (
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          {/* Search Bar */}
          {searchPlaceholder && (
            <div className='relative flex-1'>
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

          {showToggleButton ? (
            <Button
              type='button'
              size='xs'
              variant={hasActiveFilters ? 'default' : 'outline'}
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'h-8 px-2 shrink-0 sm:ml-auto',
                hasActiveFilters && 'bg-blue-600 text-white hover:bg-blue-500'
              )}
            >
              {isExpanded ? 'Hide Filters' : 'Show Filters'}
              {hasActiveFilters && <span> ({activeFilterCount})</span>}
            </Button>
          ) : null}
        </div>
      )}

      {/* Filter Controls */}
      {filterFieldsToRender.length > 0 && (
        <>
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
            <Label className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'>{field.label}</Label>
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
          <Label className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'>{field.label}</Label>
          <SelectSimple
            size='sm'
            value={getSingleSelectValue(value)}
            onValueChange={(val) => onChange(val)}
            options={options}
            placeholder={field.placeholder}
            triggerClassName='h-8'
            ariaLabel={field.label}
          />
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
          <Label className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'>{field.label}</Label>
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
          <Label className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'>{field.label}</Label>
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
          <Label className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'>{field.label}</Label>
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
          <Label className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'>{field.label}</Label>
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
