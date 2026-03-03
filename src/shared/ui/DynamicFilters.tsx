'use client';

import React from 'react';

import { FilterField } from '@/shared/contracts/ui';
import { FiltersContainer } from './filters-container';
import { Input } from './input';
import { Label } from './label';
import { MultiSelect } from './multi-select';
import { SearchInput } from './search-input';
import { SelectSimple } from './select-simple';

interface DynamicFiltersProps {
  fields: FilterField[];
  values: Record<string, string | string[] | number | boolean | null | undefined>;
  onChange: (key: string, value: string | string[]) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  title?: string;
  gridClassName?: string;
  className?: string;
}

/**
 * @deprecated Use FilterPanel from @/shared/ui/templates/FilterPanel instead.
 * A generic filtering component that renders a grid of filter fields based on configuration.
 * Consolidates the usage of FiltersContainer, Input, Label, and Selects.
 */
export function DynamicFilters({
  fields,
  values,
  onChange,
  onReset,
  hasActiveFilters,
  title,
  gridClassName,
  className,
}: DynamicFiltersProps): React.JSX.Element {
  return (
    <FiltersContainer
      {...(title ? { title } : {})}
      {...(onReset ? { onReset } : {})}
      {...(hasActiveFilters !== undefined ? { hasActiveFilters } : {})}
      {...(gridClassName ? { gridClassName } : {})}
      {...(className ? { className } : {})}
    >
      {fields.map((field) => (
        <div key={field.key} className={field.colSpan}>
          <Label
            htmlFor={`filter-${field.key}`}
            className='text-[11px] font-medium text-gray-400 mb-1.5 block'
          >
            {field.label}
          </Label>

          {field.type === 'multi-select' ? (
            <MultiSelect
              options={field.options ?? []}
              selected={Array.isArray(values[field.key]) ? (values[field.key] as string[]) : []}
              onChange={(vals) => onChange(field.key, vals)}
              placeholder={field.placeholder ?? `Filter by ${field.label.toLowerCase()}...`}
              className='w-full'
            />
          ) : field.type === 'select' ? (
            <SelectSimple
              value={String(values[field.key] ?? '')}
              onValueChange={(value) => onChange(field.key, value)}
              options={field.options ?? []}
              placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}...`}
              size='sm'
            />
          ) : field.type === 'search' ? (
            <SearchInput
              id={`filter-${field.key}`}
              placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}...`}
              value={String(values[field.key] ?? '')}
              onChange={(e) => onChange(field.key, e.target.value)}
              onClear={() => onChange(field.key, '')}
              variant='subtle'
              size='sm'
            />
          ) : (
            <Input
              id={`filter-${field.key}`}
              type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder ?? field.label}
              value={String(values[field.key] ?? '')}
              onChange={(e) => onChange(field.key, e.target.value)}
              variant='subtle'
              size='sm'
            />
          )}
        </div>
      ))}
    </FiltersContainer>
  );
}
