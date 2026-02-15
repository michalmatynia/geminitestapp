'use client';

import React from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

import {
  type ExploderPatternSubTab,
  type PatternCollectionTab,
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
    patternTab,
    patternTabLocked,
    setPatternTab,
    exploderSubTab,
    exploderSubTabLocked,
    setExploderSubTab,
    includeDisabled,
    setIncludeDisabled,
    filteredDrafts,
  } = usePromptEngine();
  const activeTabLabel =
    patternTab === 'core'
      ? 'Core'
      : exploderSubTab === 'image_studio_rules'
        ? 'Image Studio Rules'
        : exploderSubTab === 'case_resolver_rules'
          ? 'Case Resolver Rules'
          : 'Prompt Exploder Rules';
  const showPatternTabSwitch = !patternTabLocked;
  const showExploderSubTabSwitch = patternTab === 'prompt_exploder' && !exploderSubTabLocked;

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
    <div className='space-y-3'>
      {showPatternTabSwitch ? (
        <Tabs
          value={patternTab}
          onValueChange={(value: string) => {
            setPatternTab(value as PatternCollectionTab);
          }}
        >
          <TabsList className='grid w-full max-w-md grid-cols-2'>
            <TabsTrigger value='core'>
              Core Patterns
            </TabsTrigger>
            <TabsTrigger value='prompt_exploder'>
              Exploder
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      {showExploderSubTabSwitch ? (
        <Tabs
          value={exploderSubTab}
          onValueChange={(value: string) => {
            setExploderSubTab(value as ExploderPatternSubTab);
          }}
        >
          <TabsList className='grid w-full max-w-2xl grid-cols-3'>
            <TabsTrigger value='prompt_exploder_rules'>
              Prompt Exploder
            </TabsTrigger>
            <TabsTrigger value='image_studio_rules'>
              Image Studio
            </TabsTrigger>
            <TabsTrigger value='case_resolver_rules'>
              Case Resolver
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <div className='text-xs text-gray-400'>
        Showing <span className='text-gray-200'>{filteredDrafts.length}</span> pattern(s) in{' '}
        <span className='text-gray-200'>{activeTabLabel}</span>{' '}
        list.
      </div>

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
          if (!patternTabLocked) {
            setPatternTab('core');
          }
          if (!exploderSubTabLocked) {
            setExploderSubTab('prompt_exploder_rules');
          }
          setIncludeDisabled(false);
        }}
        showHeader={false}
        compact={false}
      />
    </div>
  );
}
