'use client';

import React, { ReactNode } from 'react';

import { PanelFilters } from './panels/PanelFilters';
import { FilterField } from './panels/types';

/**
 * FilterPanel - Enhanced filter container with context integration support
 * 
 * Wraps PanelFilters with additional features for feature-level consolidation:
 * - Context state management
 * - Preset filter templates
 * - Custom render slots
 * - Header/footer customization
 */
export interface FilterPanelProps {
  // Filter configuration
  filters: FilterField[];
  values: Record<string, unknown>;

  // Search
  search?: string;
  searchPlaceholder?: string;

  // Callbacks
  onFilterChange: (key: string, value: unknown) => void;
  onSearchChange?: (search: string) => void;
  onReset?: () => void;

  // Presets/quick filters
  presets?: Array<{
    label: string;
    values: Record<string, unknown>;
  }>;
  onApplyPreset?: (preset: Record<string, unknown>) => void;

  // Layout
  compact?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  headerAction?: ReactNode;

  // Styling
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  search = '',
  searchPlaceholder = 'Search...',
  onFilterChange,
  onSearchChange,
  onReset,
  presets = [],
  onApplyPreset,
  compact = false,
  collapsible = false,
  defaultExpanded,
  showHeader = true,
  headerTitle = 'Filters',
  headerAction,
  className,
}) => {
  const isActiveFilterValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value !== '';
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const hasActiveFilters = Object.values(values).some(
    (value) => isActiveFilterValue(value)
  ) || search;

  const activeFilterCount = Object.entries(values).filter(
    ([, value]) => isActiveFilterValue(value)
  ).length;

  return (
    <div className={className}>
      {/* Optional Header */}
      {showHeader && (
        <div className='mb-3 flex items-center justify-between'>
          <h3 className='text-sm font-medium text-gray-700'>{headerTitle}</h3>
          {headerAction}
        </div>
      )}

      {/* Main Filters */}
      <PanelFilters
        filters={filters}
        values={values}
        search={search}
        searchPlaceholder={searchPlaceholder}
        onFilterChange={onFilterChange}
        {...(onSearchChange !== undefined ? { onSearchChange } : {})}
        {...(onReset !== undefined ? { onReset } : {})}
        compact={compact}
        collapsible={collapsible}
        {...(defaultExpanded !== undefined ? { defaultExpanded } : {})}
      />

      {/* Presets (if provided) */}
      {presets.length > 0 && (
        <div className='mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3'>
          <span className='text-xs font-medium text-gray-600'>Quick filters:</span>
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => onApplyPreset?.(preset.values)}
              className='inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100'
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Active Filter Count */}
      {hasActiveFilters && (
        <div className='mt-2 text-xs text-gray-500'>
          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
        </div>
      )}
    </div>
  );
};

FilterPanel.displayName = 'FilterPanel';
