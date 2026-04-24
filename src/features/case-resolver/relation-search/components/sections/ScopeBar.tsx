'use client';

import { AlignJustify, List, ListPlus, SlidersHorizontal } from 'lucide-react';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { getCaseResolverDocTooltip } from '@/features/case-resolver/relation-search/utils/docs';
import { type DocumentRelationFileTypeFilter, type DocumentRelationSortMode } from '@/shared/contracts/case-resolver';
import { SelectSimple, SegmentedControl, Chip } from '@/shared/ui/forms-and-actions.public';
import { Tooltip } from '@/shared/ui/primitives.public';

import {
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
} from '../../context/DocumentRelationSearchContext';
import { useDocumentRelationSearchUiContext } from '../DocumentRelationSearchUiContext';

const SORT_OPTIONS: Array<LabeledOptionDto<DocumentRelationSortMode>> = [
  { value: 'name_asc', label: 'Name A→Z' },
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'folder_asc', label: 'Folder A→Z' },
];

const FILE_TYPE_OPTIONS: Array<LabeledOptionDto<DocumentRelationFileTypeFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'document', label: 'Documents' },
  { value: 'scanfile', label: 'Scans' },
];

const DOCUMENT_SEARCH_SCOPE_OPTIONS = [
  { value: 'case_scope', label: 'Current Case' },
  { value: 'all_cases', label: 'All Cases' },
] as const;

const RESULT_HEIGHT_OPTIONS = [
  { value: 'compact', label: '', icon: AlignJustify, ariaLabel: 'Compact view' },
  { value: 'normal', label: '', icon: List, ariaLabel: 'Comfortable view' },
  { value: 'expanded', label: '', icon: ListPlus, ariaLabel: 'Expanded view' },
] as const;

export function ScopeBar(): React.JSX.Element {
  const { showFileTypeFilter, showSortControl } = useDocumentRelationSearchUiContext();
  const state = useDocumentRelationSearchStateContext();
  const actions = useDocumentRelationSearchActionsContext();

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border/60 bg-card/30 px-3 py-2'>
      <SegmentedControl
        options={DOCUMENT_SEARCH_SCOPE_OPTIONS}
        value={state.documentSearchScope}
        onChange={actions.setDocumentSearchScope}
        ariaLabel='Document search scope'
      />

      {showFileTypeFilter && (
        <FileTypeFilters
          value={state.fileTypeFilter}
          onChange={actions.setFileTypeFilter}
        />
      )}

      <FilterChip
        active={state.showFiltersBar}
        activeCount={state.filtersActiveCount}
        onClick={() => actions.setShowFiltersBar((p) => !p)}
      />

      <div className='flex-1' />

      {showSortControl && (
        <SortControl
          value={state.sortMode}
          onChange={(v) => actions.setSortMode(v as DocumentRelationSortMode)}
        />
      )}

      <SegmentedControl
        size='xs'
        options={RESULT_HEIGHT_OPTIONS}
        value={state.resultHeight}
        onChange={actions.setResultHeight}
        activeClassName='text-cyan-300'
        ariaLabel='Result density'
      />
    </div>
  );
}
function FileTypeFilters({
  value,
  onChange,
}: {
  value: DocumentRelationFileTypeFilter;
  onChange: (v: DocumentRelationFileTypeFilter) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-1'>
      {FILE_TYPE_OPTIONS.map(({ value: v, label }) => (
        <Chip key={v} label={label} active={value === v} onClick={() => onChange(v)} />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  activeCount,
  onClick,
}: {
  active: boolean;
  activeCount: number;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Tooltip content={getCaseResolverDocTooltip('advancedFilters')} side='bottom'>
      <div className='relative'>
        <Chip label='Filters' icon={SlidersHorizontal} active={active} onClick={onClick} />
        {activeCount > 0 && (
          <span className='absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-black pointer-events-none'>
            {activeCount}
          </span>
        )}
      </div>
    </Tooltip>
  );
}

function SortControl({
  value,
  onChange,
}: {
  value: DocumentRelationSortMode;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <SelectSimple
      size='xs'
      variant='subtle'
      value={value}
      onValueChange={onChange}
      options={SORT_OPTIONS}
      className='w-[130px]'
      triggerClassName='h-8 text-xs'
      ariaLabel='Sort results'
      title='Select option'
    />
  );
}

