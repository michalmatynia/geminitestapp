'use client';

import { useMemo, type JSX, type ReactNode } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { PanelFilters, PanelFiltersSearchPlaceholderRuntimeContext } from './panels/PanelFilters';
import { FilterField } from '@/shared/contracts/ui';

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

  // Custom slots
  actions?: ReactNode;
  children?: ReactNode;

  // Styling
  className?: string;
}

type FilterPanelRuntimeValue = {
  filters: FilterField[];
  values: Record<string, unknown>;
  search: string;
  filterSearchPlaceholder: string;
  onFilterChange: (key: string, value: unknown) => void;
  onSearchChange?: (search: string) => void;
  onReset?: () => void;
  presets: Array<{
    label: string;
    values: Record<string, unknown>;
  }>;
  onApplyPreset?: (preset: Record<string, unknown>) => void;
  compact: boolean;
  collapsible: boolean;
  defaultExpanded?: boolean;
  showHeader: boolean;
  headerTitle: string;
  headerAction?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

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

const { Context: FilterPanelRuntimeContext, useStrictContext: useFilterPanelRuntime } =
  createStrictContext<FilterPanelRuntimeValue>({
    hookName: 'useFilterPanelRuntime',
    providerName: 'FilterPanelRuntimeProvider',
    displayName: 'FilterPanelRuntimeContext',
  });

function FilterPanelHeader(): JSX.Element | null {
  const { headerAction, headerTitle, showHeader } = useFilterPanelRuntime();
  if (!showHeader) return null;
  return (
    <div className='mb-3 flex items-center justify-between'>
      <h3 className='text-sm font-medium text-gray-700'>{headerTitle}</h3>
      {headerAction}
    </div>
  );
}

function FilterPanelMainFilters(): JSX.Element {
  const {
    actions,
    collapsible,
    compact,
    defaultExpanded,
    filterSearchPlaceholder,
    filters,
    onFilterChange,
    onReset,
    onSearchChange,
    search,
    values,
  } = useFilterPanelRuntime();
  return (
    <PanelFiltersSearchPlaceholderRuntimeContext.Provider value={filterSearchPlaceholder}>
      <PanelFilters
        filters={filters}
        values={values}
        search={search}
        onFilterChange={onFilterChange}
        {...(onSearchChange !== undefined ? { onSearchChange } : {})}
        {...(onReset !== undefined ? { onReset } : {})}
        compact={compact}
        collapsible={collapsible}
        {...(defaultExpanded !== undefined ? { defaultExpanded } : {})}
        {...(actions !== undefined ? { actions } : {})}
      />
    </PanelFiltersSearchPlaceholderRuntimeContext.Provider>
  );
}

function FilterPanelChildrenSlot(): JSX.Element | null {
  const { children } = useFilterPanelRuntime();
  if (!children) return null;
  return <div className='mt-3'>{children}</div>;
}

function FilterPanelPresets(): JSX.Element | null {
  const { onApplyPreset, presets } = useFilterPanelRuntime();
  if (presets.length === 0) return null;
  return (
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
  );
}

function FilterPanelActiveCount(): JSX.Element | null {
  const { search, values } = useFilterPanelRuntime();
  const hasActiveFilters =
    Object.values(values).some((value) => isActiveFilterValue(value)) || search;
  if (!hasActiveFilters) return null;
  const activeFilterCount = Object.entries(values).filter(([, value]) =>
    isActiveFilterValue(value)
  ).length;
  return (
    <div className='mt-2 text-xs text-gray-500'>
      {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
    </div>
  );
}

function FilterPanelRuntime(): JSX.Element {
  const { className } = useFilterPanelRuntime();
  return (
    <div className={className}>
      <FilterPanelHeader />
      <FilterPanelMainFilters />
      <FilterPanelChildrenSlot />
      <FilterPanelPresets />
      <FilterPanelActiveCount />
    </div>
  );
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
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
  showHeader = true,
  headerTitle = 'Filters',
  headerAction,
  actions,
  children,
  className,
}) => {
  const runtimeValue = useMemo<FilterPanelRuntimeValue>(
    () => ({
      filters,
      values,
      search,
      filterSearchPlaceholder,
      onFilterChange,
      onSearchChange,
      onReset,
      presets,
      onApplyPreset,
      compact,
      collapsible,
      defaultExpanded,
      showHeader,
      headerTitle,
      headerAction,
      actions,
      children,
      className,
    }),
    [
      actions,
      children,
      className,
      collapsible,
      compact,
      defaultExpanded,
      filterSearchPlaceholder,
      filters,
      headerAction,
      headerTitle,
      onApplyPreset,
      onFilterChange,
      onReset,
      onSearchChange,
      presets,
      search,
      showHeader,
      values,
    ]
  );

  return (
    <FilterPanelRuntimeContext.Provider value={runtimeValue}>
      <FilterPanelRuntime />
    </FilterPanelRuntimeContext.Provider>
  );
};

FilterPanel.displayName = 'FilterPanel';
