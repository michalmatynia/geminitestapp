'use client';

import { Search, X } from 'lucide-react';
import React, { useState, useCallback } from 'react';


import { UnifiedButton } from '@/shared/ui';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/utils/ui-utils';

import { FilterField } from './types';

interface PanelFiltersProps {
  filters: FilterField[];
  values: Record<string, any>;
  search?: string;
  searchPlaceholder?: string;
  onFilterChange: (key: string, value: any) => void;
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
  search = '',
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

  const handleReset = useCallback(() => {
    onReset?.();
    setIsExpanded(false);
  }, [onReset]);

  const hasActiveFilters = Object.values(values).some((v) => v !== undefined && v !== null && v !== '');
  const activeFilterCount = Object.values(values).filter((v) => v !== undefined && v !== null && v !== '').length;

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
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className='pl-8 pr-8'
          />
          {search && (
            <button
              onClick={() => onSearchChange?.('')}
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
            <UnifiedButton
              type='button'
              size='sm'
              variant={hasActiveFilters ? 'default' : 'outline'}
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'h-8 px-2',
                hasActiveFilters && 'bg-blue-600 text-white hover:bg-blue-500'
              )}
            >
              {isExpanded ? 'Hide Filters' : 'Show Filters'}
              {hasActiveFilters && <span> ({activeFilterCount})</span>}
            </UnifiedButton>
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
                <UnifiedButton
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleReset}
                  className='ml-auto'
                >
                  Reset Filters
                </UnifiedButton>
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
  value: any;
  onChange: (value: any) => void;
}

/**
 * FilterControl - Renders individual filter input based on field type
 */
const FilterControl: React.FC<FilterControlProps> = ({ field, value, onChange }) => {
  const containerStyle: React.CSSProperties = {
    ...(field.width ? { width: field.width } : {}),
  };

  switch (field.type) {
    case 'select':
      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className='h-8'>
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

    case 'checkbox':
      return (
        <div style={containerStyle} className='flex items-center gap-2 py-1'>
          <Checkbox
            id={field.key}
            checked={value || false}
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
            value={value || ''}
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
            value={value || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className='h-8 text-sm'
          />
        </div>
      );

    case 'dateRange':
      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <div className='flex gap-1'>
            <Input
              type='date'
              placeholder='From'
              value={value?.from || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  from: e.target.value || undefined,
                })
              }
              className='h-8 text-sm'
            />
            <Input
              type='date'
              placeholder='To'
              value={value?.to || ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  to: e.target.value || undefined,
                })
              }
              className='h-8 text-sm'
            />
          </div>
        </div>
      );

    case 'text':
    default:
      return (
        <div style={containerStyle} className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>{field.label}</label>
          <Input
            type='text'
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className='h-8 text-sm'
          />
        </div>
      );
  }
};

PanelFilters.displayName = 'PanelFilters';
