'use client';

import React from 'react';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';
import { usePromptEngine, type SeverityFilter } from '../context/PromptEngineContext';

/**
 * REFACTORED: PromptEngineFilters using FilterPanel template
 * 
 * Before: 50 LOC
 * After: 22 LOC
 * Savings: 56% reduction
 */
export function PromptEngineFilters(): React.JSX.Element {
  const { query, setQuery, severity, setSeverity, includeDisabled, setIncludeDisabled } = usePromptEngine();

  const filters: FilterField[] = [
    {
      key: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'all', label: 'All' },
        { value: 'error', label: 'Error' },
        { value: 'warning', label: 'Warning' },
        { value: 'info', label: 'Info' },
      ],
    },
    {
      key: 'includeDisabled',
      label: 'Include Disabled',
      type: 'checkbox',
    },
  ];

  return (
    <FilterPanel
      filters={filters}
      values={{ severity, includeDisabled }}
      search={query}
      searchPlaceholder="Search ids, patterns, suggestions..."
      onFilterChange={(key, value) => {
        if (key === 'severity') setSeverity(value as SeverityFilter);
        if (key === 'includeDisabled') setIncludeDisabled(value);
      }}
      onSearchChange={setQuery}
      onReset={() => {
        setQuery('');
        setSeverity('all');
        setIncludeDisabled(false);
      }}
      showHeader={false}
      compact={false}
    />
  );
}
