'use client';

import { type JSX, type ReactNode } from 'react';

import { FilterField } from '@/shared/contracts/ui';

import { PanelFilters, PanelFiltersSearchPlaceholderRuntimeContext } from './panels/PanelFilters';

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
  activeValues?: Record<string, unknown>;

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
  toggleButtonAlignment?: 'start' | 'end';
  showHeader?: boolean;
  headerTitle?: string;
  headerAction?: ReactNode;

  // Custom slots
  actions?: ReactNode;
  children?: ReactNode;

  // Styling
  className?: string;
}

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

interface FilterPanelHeaderProps {
  showHeader: boolean;
  headerTitle: string;
  headerAction?: ReactNode;
}

function FilterPanelHeader({
  headerAction,
  headerTitle,
  showHeader,
}: FilterPanelHeaderProps): JSX.Element | null {
  if (!showHeader) return null;
  return (
    <div className='mb-3 flex items-center justify-between'>
      <h2 className='text-sm font-medium text-gray-700'>{headerTitle}</h2>
      {headerAction}
    </div>
  );
}

interface FilterPanelMainFiltersProps {
  actions?: ReactNode;
  activeValues?: Record<string, unknown>;
  collapsible: boolean;
  compact: boolean;
  defaultExpanded?: boolean;
  filterSearchPlaceholder: string;
  filters: FilterField[];
  onFilterChange: (key: string, value: unknown) => void;
  onReset?: () => void;
  onSearchChange?: (search: string) => void;
  search: string;
  toggleButtonAlignment: 'start' | 'end';
  values: Record<string, unknown>;
}

function FilterPanelMainFilters({
  actions,
  activeValues,
  collapsible,
  compact,
  defaultExpanded,
  filterSearchPlaceholder,
  filters,
  onFilterChange,
  onReset,
  onSearchChange,
  search,
  toggleButtonAlignment,
  values,
}: FilterPanelMainFiltersProps): JSX.Element {
  return (
    <PanelFiltersSearchPlaceholderRuntimeContext.Provider value={filterSearchPlaceholder}>
      <PanelFilters
        filters={filters}
        values={values}
        {...(activeValues !== undefined ? { activeValues } : {})}
        search={search}
        onFilterChange={onFilterChange}
        {...(onSearchChange !== undefined ? { onSearchChange } : {})}
        {...(onReset !== undefined ? { onReset } : {})}
        compact={compact}
        collapsible={collapsible}
        {...(defaultExpanded !== undefined ? { defaultExpanded } : {})}
        toggleButtonAlignment={toggleButtonAlignment}
        {...(actions !== undefined ? { actions } : {})}
      />
    </PanelFiltersSearchPlaceholderRuntimeContext.Provider>
  );
}

function FilterPanelChildrenSlot({ children }: { children?: ReactNode }): JSX.Element | null {
  if (!children) return null;
  return <div className='mt-3'>{children}</div>;
}

interface FilterPanelPresetsProps {
  presets: Array<{
    label: string;
    values: Record<string, unknown>;
  }>;
  onApplyPreset?: (preset: Record<string, unknown>) => void;
}

function FilterPanelPresets({ onApplyPreset, presets }: FilterPanelPresetsProps): JSX.Element | null {
  if (presets.length === 0) return null;
  return (
    <div className='mt-3 flex flex-wrap gap-2 border-t border-gray-200 pt-3'>
      <span className='text-xs font-medium text-gray-600'>Quick filters:</span>
      {presets.map((preset, index) => (
        <button
          key={index}
          onClick={() => onApplyPreset?.(preset.values)}
          className='inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100'
          aria-label={preset.label}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

interface FilterPanelActiveCountProps {
  activeValues?: Record<string, unknown>;
  search: string;
  values: Record<string, unknown>;
}

function FilterPanelActiveCount({
  activeValues,
  search,
  values,
}: FilterPanelActiveCountProps): JSX.Element | null {
  const activeFilterSource = activeValues ?? values;
  const hasActiveFilters =
    Object.values(activeFilterSource).some((value) => isActiveFilterValue(value)) || search;
  if (!hasActiveFilters) return null;
  const activeFilterCount = Object.entries(activeFilterSource).filter(([, value]) =>
    isActiveFilterValue(value)
  ).length;
  return (
    <div className='mt-2 text-xs text-gray-500'>
      {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
    </div>
  );
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  activeValues,
  search = '',
  searchPlaceholder: filterSearchPlaceholder = 'Search...',
  onFilterChange,
  onSearchChange,
  onReset,
  presets = [],
  onApplyPreset,
  compact = false,
  collapsible = false,
  defaultExpanded,
  toggleButtonAlignment = 'end',
  showHeader = true,
  headerTitle = 'Filters',
  headerAction,
  actions,
  children,
  className,
}) => {
  return (
    <div className={className}>
      <FilterPanelHeader
        showHeader={showHeader}
        headerTitle={headerTitle}
        {...(headerAction !== undefined ? { headerAction } : {})}
      />
      <FilterPanelMainFilters
        filters={filters}
        values={values}
        {...(activeValues !== undefined ? { activeValues } : {})}
        search={search}
        filterSearchPlaceholder={filterSearchPlaceholder}
        onFilterChange={onFilterChange}
        {...(onSearchChange !== undefined ? { onSearchChange } : {})}
        {...(onReset !== undefined ? { onReset } : {})}
        compact={compact}
        collapsible={collapsible}
        {...(defaultExpanded !== undefined ? { defaultExpanded } : {})}
        toggleButtonAlignment={toggleButtonAlignment}
        {...(actions !== undefined ? { actions } : {})}
      />
      <FilterPanelChildrenSlot {...(children !== undefined ? { children } : {})} />
      <FilterPanelPresets presets={presets} {...(onApplyPreset !== undefined ? { onApplyPreset } : {})} />
      <FilterPanelActiveCount values={values} search={search} {...(activeValues !== undefined ? { activeValues } : {})} />
    </div>
  );
};

FilterPanel.displayName = 'FilterPanel';
