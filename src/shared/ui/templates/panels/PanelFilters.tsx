'use client';

import { Search, X } from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import { FilterField } from '@/shared/contracts/ui';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button, Label, SelectSimple, SearchInput } from '@/shared/ui';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { cn } from '@/shared/utils';

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
      .filter(
        (entry): entry is string | number => typeof entry === 'string' || typeof entry === 'number'
      )
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
  actions?: React.ReactNode;
  className?: string;
}

type PanelFiltersRuntimeValue = {
  values: Record<string, unknown>;
  onFilterChange: (key: string, value: unknown) => void;
};

const { Context: PanelFiltersRuntimeContext, useStrictContext: usePanelFiltersRuntime } =
  createStrictContext<PanelFiltersRuntimeValue>({
    hookName: 'usePanelFiltersRuntime',
    providerName: 'PanelFiltersRuntimeProvider',
    displayName: 'PanelFiltersRuntimeContext',
  });

export const PanelFiltersSearchPlaceholderRuntimeContext = React.createContext<string | undefined>(
  undefined
);

/**
 * PanelFilters - Renders dynamic filter controls based on FilterField configuration
 * Supports: text input, select dropdown, date input, checkbox, number input
 */
export const PanelFilters: React.FC<PanelFiltersProps> = (props: PanelFiltersProps) => {
  const {
    filters,
    values,
    search: externalSearch = '',
    searchPlaceholder,
    onFilterChange,
    onSearchChange,
    onReset,
    compact = false,
    collapsible = false,
    defaultExpanded,
    actions,
    className,
  } = props;

  const runtimeSearchPlaceholder = React.useContext(PanelFiltersSearchPlaceholderRuntimeContext);
  const effectiveSearchPlaceholder = runtimeSearchPlaceholder ?? searchPlaceholder ?? 'Search...';
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? !compact);
  const [localSearch, setLocalSearch] = useState(externalSearch);
  const searchInputId = React.useId().replace(/:/g, '');
  const userToggledRef = useRef(false);

  // Sync local search with external search (e.g. on reset)
  useEffect(() => {
    setLocalSearch(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    if (defaultExpanded === undefined) return;
    if (userToggledRef.current) return;
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  // Debounce search changes
  useEffect(() => {
    if (localSearch === externalSearch) return;

    const timer = setTimeout(() => {
      onSearchChange?.(localSearch);
    }, 400);

    return () => clearTimeout(timer);
  }, [localSearch, externalSearch, onSearchChange]);

  const handleReset = useCallback(() => {
    userToggledRef.current = true;
    onReset?.();
    setLocalSearch('');
    setIsExpanded(false);
  }, [onReset]);

  const hasActiveFilters = Object.values(values).some((value) => isActiveFilterValue(value));
  const activeFilterCount = Object.values(values).filter((value) =>
    isActiveFilterValue(value)
  ).length;
  const runtimeValue = useMemo<PanelFiltersRuntimeValue>(
    () => ({
      values,
      onFilterChange,
    }),
    [values, onFilterChange]
  );

  const filterFieldsToRender = filters;
  const showToggleButton = filterFieldsToRender.length > 0 && (compact || collapsible);

  return (
    <div className={cn('space-y-3', className)}>
      {(effectiveSearchPlaceholder || showToggleButton) && (
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          {/* Search Bar */}
          {effectiveSearchPlaceholder && (
            <div className='relative flex-1'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-gray-400' />
              <Input
                id={`panel-filters-search-${searchInputId}`}
                type='text'
                placeholder={effectiveSearchPlaceholder}
                aria-label={effectiveSearchPlaceholder}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className='pl-8 pr-8'
               title={effectiveSearchPlaceholder}/>
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch('');
                    onSearchChange?.('');
                  }}
                  className='absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600'
                  aria-label='Clear search'
                  title={'Clear search'}>
                  <X className='h-4 w-4' />
                </button>
              )}
            </div>
          )}

          {actions && (
            <div className='flex w-full items-center gap-2 sm:w-auto sm:shrink-0'>{actions}</div>
          )}

          {showToggleButton ? (
            <Button
              type='button'
              size='xs'
              variant={hasActiveFilters ? 'default' : 'outline'}
              onClick={() => {
                userToggledRef.current = true;
                setIsExpanded(!isExpanded);
              }}
              className={cn(
                'h-8 w-full px-2 sm:ml-auto sm:w-auto',
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
            <PanelFiltersRuntimeContext.Provider value={runtimeValue}>
              <div className='flex flex-wrap gap-2'>
                {filterFieldsToRender.map((field) => (
                  <PanelFilterControl key={field.key} field={field} />
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
            </PanelFiltersRuntimeContext.Provider>
          )}
        </>
      )}
    </div>
  );
};

interface PanelFilterControlProps {
  field: FilterField;
}

/**
 * PanelFilterControl - Renders individual filter input based on field type
 */
const PanelFilterControl: React.FC<PanelFilterControlProps> = (props: PanelFilterControlProps) => {
  const { field } = props;

  const runtime = usePanelFiltersRuntime();
  const value = runtime.values[field.key];
  const fieldId = React.useId().replace(/:/g, '');
  const inputId = `panel-filter-${field.key}-${fieldId}`;
  const labelId = `${inputId}-label`;
  const onChange = useCallback(
    (nextValue: unknown): void => {
      runtime.onFilterChange(field.key, nextValue);
    },
    [field.key, runtime]
  );
  const containerStyle: React.CSSProperties = {
    ...(field.width ? { width: field.width } : {}),
    maxWidth: '100%',
  };

  const [localValue, setLocalValue] = useState<string | number | undefined>(
    value as string | number | undefined
  );

  // Sync local value with external value (e.g. on reset or external change)
  useEffect(() => {
    setLocalValue(value as string | number | undefined);
  }, [value]);

  // Debounce changes for text and number fields
  useEffect(() => {
    if (
      field.type !== 'text' &&
      field.type !== 'number' &&
      field.type !== 'date' &&
      field.type !== 'search'
    )
      return;
    if (localValue === value) return;

    const timer = setTimeout(() => {
      onChange(localValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, field.type]);

  switch (field.type) {
    case 'multi-select':
    case 'select': {
      const options = (field.options ?? []).map((option) => ({
        value: String(option.value),
        label: option.label,
      }));

      if (field.multi || field.type === 'multi-select') {
        return (
          <div style={containerStyle} className={cn('flex flex-col gap-1', field.className)}>
            <Label
              id={labelId}
              className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'
            >
              {field.label}
            </Label>
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
        <div style={containerStyle} className={cn('flex flex-col gap-1', field.className)}>
          <Label
            id={labelId}
            className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'
          >
            {field.label}
          </Label>
          <SelectSimple
            size='sm'
            value={getSingleSelectValue(value)}
            onValueChange={(val) => onChange(val)}
            options={options}
            placeholder={field.placeholder}
            triggerClassName='h-8 w-full min-w-[9rem]'
            ariaLabel={field.label}
           title={field.placeholder}/>
        </div>
      );
    }

    case 'search':
      return (
        <div style={containerStyle} className={cn('flex flex-col gap-1', field.className)}>
          <Label
            id={labelId}
            className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'
          >
            {field.label}
          </Label>
          <SearchInput
            id={inputId}
            aria-labelledby={labelId}
            placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}...`}
            value={String(localValue ?? '')}
            onChange={(e) => setLocalValue(e.target.value)}
            onClear={() => {
              setLocalValue('');
              onChange('');
            }}
            variant='subtle'
            size='sm'
          />
        </div>
      );

    case 'checkbox':
      return (
        <div style={containerStyle} className={cn('flex items-center gap-2 py-1', field.className)}>
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
        <div style={containerStyle} className={cn('flex flex-col gap-1', field.className)}>
          <Label
            htmlFor={inputId}
            id={labelId}
            className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'
          >
            {field.label}
          </Label>
          <Input
            id={inputId}
            type='number'
            placeholder={field.placeholder}
            value={localValue ?? ''}
            onChange={(e) => setLocalValue(e.target.value ? Number(e.target.value) : undefined)}
            className='h-8 w-full text-sm'
           aria-label={field.placeholder} title={field.placeholder}/>
        </div>
      );

    case 'date':
      return (
        <div style={containerStyle} className={cn('flex flex-col gap-1', field.className)}>
          <Label
            htmlFor={inputId}
            id={labelId}
            className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'
          >
            {field.label}
          </Label>
          <Input
            id={inputId}
            type='date'
            value={(localValue as string) || ''}
            onChange={(e) => setLocalValue(e.target.value || undefined)}
            className='h-8 w-full text-sm'
           aria-label={inputId} title={inputId}/>
        </div>
      );

    case 'dateRange': {
      const rangeValue = value as { from?: string; to?: string } | undefined;
      return (
        <div style={containerStyle} className={cn('flex flex-col gap-1', field.className)}>
          <Label
            id={labelId}
            className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'
          >
            {field.label}
          </Label>
          <div className='flex gap-1' role='group' aria-labelledby={labelId}>
            <Input
              type='date'
              placeholder='From'
              id={`${inputId}-from`}
              aria-label={`${field.label} from`}
              value={rangeValue?.from || ''}
              onChange={(e) =>
                onChange({
                  ...(rangeValue || {}),
                  from: e.target.value || undefined,
                })
              }
              className='h-8 w-full text-sm'
             title='From'/>
            <Input
              type='date'
              placeholder='To'
              id={`${inputId}-to`}
              aria-label={`${field.label} to`}
              value={rangeValue?.to || ''}
              onChange={(e) =>
                onChange({
                  ...(rangeValue || {}),
                  to: e.target.value || undefined,
                })
              }
              className='h-8 w-full text-sm'
             title='To'/>
          </div>
        </div>
      );
    }

    case 'text':
    default:
      return (
        <div style={containerStyle} className={cn('flex flex-col gap-1', field.className)}>
          <Label
            htmlFor={inputId}
            id={labelId}
            className='text-[10px] font-semibold uppercase tracking-wider text-gray-500/80'
          >
            {field.label}
          </Label>
          <Input
            id={inputId}
            type='text'
            placeholder={field.placeholder}
            value={(localValue as string) || ''}
            onChange={(e) => setLocalValue(e.target.value || undefined)}
            className='h-8 w-full text-sm'
           aria-label={field.placeholder} title={field.placeholder}/>
        </div>
      );
  }
};

PanelFilters.displayName = 'PanelFilters';
