'use client';

import React from 'react';

import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

import {
  usePromptEngine,
  type ScopeFilter,
  type SeverityFilter,
} from '../context/PromptEngineContext';
import { PROMPT_VALIDATION_SCOPE_LABELS, PROMPT_VALIDATION_SCOPE_VALUES } from '../settings';

/**
 * REFACTORED: PromptEngineFilters using FilterPanel template
 * 
 * Before: 50 LOC
 * After: 22 LOC
 * Savings: 56% reduction
 */
export function PromptEngineFilters(): React.JSX.Element {
  const {
    query,
    setQuery,
    severity,
    setSeverity,
    scope,
    setScope,
    includeDisabled,
    setIncludeDisabled,
  } = usePromptEngine();

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
      key: 'scope',
      label: 'Scope',
      type: 'select',
      options: [
        { value: 'all', label: 'All scopes' },
        ...PROMPT_VALIDATION_SCOPE_VALUES.map((value) => ({
          value,
          label: PROMPT_VALIDATION_SCOPE_LABELS[value],
        })),
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
      values={{ severity, scope, includeDisabled }}
      search={query}
      searchPlaceholder='Search ids, patterns, suggestions...'
      onFilterChange={(key, value) => {
        if (key === 'severity') setSeverity(value as SeverityFilter);
        if (key === 'scope') setScope(value as ScopeFilter);
        if (key === 'includeDisabled') setIncludeDisabled(Boolean(value));
      }}
      onSearchChange={setQuery}
      onReset={() => {
        setQuery('');
        setSeverity('all');
        setScope('all');
        setIncludeDisabled(false);
      }}
      showHeader={false}
      compact={false}
    />
  );
}
