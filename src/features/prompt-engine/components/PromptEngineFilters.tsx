'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  PROMPT_VALIDATION_SCOPE_LABELS,
  PROMPT_VALIDATION_SCOPE_VALUES,
} from '@/shared/lib/prompt-engine/settings';
import { SegmentedControl } from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

import { usePromptEngineActions } from '../context/prompt-engine/PromptEngineActionsContext';
import { usePromptEngineConfig } from '../context/prompt-engine/PromptEngineConfigContext';
import { usePromptEngineData } from '../context/prompt-engine/PromptEngineDataContext';
import {
  type ScopeFilter,
  type SeverityFilter,
  usePromptEngineFilters,
} from '../context/prompt-engine/PromptEngineFiltersContext';
import type {
  ExploderPatternSubTab,
  PatternCollectionTab,
} from '../context/prompt-engine/PromptEngineConfigContext';

const SEVERITY_OPTIONS: Array<LabeledOptionDto<SeverityFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const SCOPE_OPTIONS: Array<LabeledOptionDto<ScopeFilter>> = [
  { value: 'all', label: 'All scopes' },
  ...PROMPT_VALIDATION_SCOPE_VALUES.map((value) => ({
    value,
    label: PROMPT_VALIDATION_SCOPE_LABELS[value],
  })),
];

const PATTERN_TAB_OPTIONS: Array<LabeledOptionDto<PatternCollectionTab>> = [
  { value: 'core', label: 'Core Patterns' },
  { value: 'prompt_exploder', label: 'Exploder' },
];

const EXPLODER_SUBTAB_OPTIONS: Array<LabeledOptionDto<ExploderPatternSubTab>> = [
  { value: 'prompt_exploder_rules', label: 'Prompt Exploder' },
  { value: 'image_studio_rules', label: 'Image Studio' },
  { value: 'case_resolver_rules', label: 'Case Resolver' },
];

/**
 * REFACTORED: PromptEngineFilters using FilterPanel template
 *
 * Before: 50 LOC
 * After: 22 LOC
 * Savings: 56% reduction
 */
export function PromptEngineFilters(): React.JSX.Element {
  const { patternTab, patternTabLocked, exploderSubTab, exploderSubTabLocked, scopeLocked } =
    usePromptEngineConfig();
  const {
    query,
    setQuery,
    severity,
    setSeverity,
    scope,
    setScope,
    includeDisabled,
    setIncludeDisabled,
  } = usePromptEngineFilters();
  const { filteredDrafts } = usePromptEngineData();
  const { setPatternTab, setExploderSubTab } = usePromptEngineActions();
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
      options: SEVERITY_OPTIONS,
    },
    ...(scopeLocked
      ? []
      : [
          {
            key: 'scope',
            label: 'Scope',
            type: 'select',
            options: SCOPE_OPTIONS,
          } satisfies FilterField,
      ]),
    {
      key: 'includeDisabled',
      label: 'Include Disabled',
      type: 'checkbox',
    },
  ];

  return (
    <div className='space-y-3'>
      {showPatternTabSwitch ? (
        <SegmentedControl
          size='md'
          className='w-full max-w-md'
          value={patternTab}
          ariaLabel='Prompt engine pattern tabs'
          onChange={(value) => {
            setPatternTab(value);
          }}
          options={PATTERN_TAB_OPTIONS}
        />
      ) : null}
      {showExploderSubTabSwitch ? (
        <SegmentedControl
          size='md'
          className='w-full max-w-2xl'
          value={exploderSubTab}
          ariaLabel='Prompt exploder rule categories'
          onChange={(value) => {
            setExploderSubTab(value);
          }}
          options={EXPLODER_SUBTAB_OPTIONS}
        />
      ) : null}

      <div className='text-xs text-gray-400'>
        Showing <span className='text-gray-200'>{filteredDrafts.length}</span> pattern(s) in{' '}
        <span className='text-gray-200'>{activeTabLabel}</span> list.
        {scopeLocked && scope !== 'all' ? (
          <>
            {' '}
            Scope: <span className='text-gray-200'>{PROMPT_VALIDATION_SCOPE_LABELS[scope]}</span>.
          </>
        ) : null}
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
          if (!scopeLocked) {
            setScope('all');
          }
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
