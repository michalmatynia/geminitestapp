'use client';

import React from 'react';
import { AlignJustify, List, ListPlus, SlidersHorizontal } from 'lucide-react';
import { SelectSimple, Tooltip, SegmentedControl, Chip } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';
import {
  type DocumentRelationFileTypeFilter,
  type DocumentRelationSortMode,
} from '@/shared/contracts/case-resolver';
import { getCaseResolverDocTooltip } from '@/features/case-resolver/relation-search/utils/docs';
import { useDocumentRelationSearchUiContext } from '../DocumentRelationSearchUiContext';

const SORT_OPTIONS: { value: DocumentRelationSortMode; label: string }[] = [
  { value: 'name_asc', label: 'Name A→Z' },
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'folder_asc', label: 'Folder A→Z' },
];

const FILE_TYPE_OPTIONS: { value: DocumentRelationFileTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'document', label: 'Documents' },
  { value: 'scanfile', label: 'Scans' },
];

export function ScopeBar(): React.JSX.Element {
  const { showFileTypeFilter, showSortControl } = useDocumentRelationSearchUiContext();
  const {
    documentSearchScope,
    setDocumentSearchScope,
    fileTypeFilter,
    setFileTypeFilter,
    sortMode,
    setSortMode,
    resultHeight,
    setResultHeight,
    filtersActiveCount,
    showFiltersBar,
    setShowFiltersBar,
  } = useDocumentRelationSearchContext();

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border/60 bg-card/30 px-3 py-2'>
      <SegmentedControl
        options={[
          { value: 'case_scope', label: 'Current Case' },
          { value: 'all_cases', label: 'All Cases' },
        ]}
        value={documentSearchScope}
        onChange={setDocumentSearchScope}
      />

      {showFileTypeFilter && (
        <div className='flex items-center gap-1'>
          {FILE_TYPE_OPTIONS.map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              active={fileTypeFilter === value}
              onClick={() => setFileTypeFilter(value)}
            />
          ))}
        </div>
      )}

      <Tooltip content={getCaseResolverDocTooltip('advancedFilters')} side='bottom'>
        <div className='relative'>
          <Chip
            label='Filters'
            icon={SlidersHorizontal}
            active={showFiltersBar}
            onClick={() => setShowFiltersBar((p) => !p)}
          />
          {filtersActiveCount > 0 && (
            <span className='absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-black pointer-events-none'>
              {filtersActiveCount}
            </span>
          )}
        </div>
      </Tooltip>

      <div className='flex-1' />

      {showSortControl && (
        <SelectSimple
          size='xs'
          variant='subtle'
          value={sortMode}
          onValueChange={(v) => setSortMode(v as DocumentRelationSortMode)}
          options={SORT_OPTIONS}
          className='w-[130px]'
          ariaLabel='Sort results'
        />
      )}

      <SegmentedControl
        size='xs'
        options={[
          { value: 'compact', label: '', icon: AlignJustify },
          { value: 'normal', label: '', icon: List },
          { value: 'expanded', label: '', icon: ListPlus },
        ]}
        value={resultHeight}
        onChange={(v) => setResultHeight(v)}
        activeClassName='text-cyan-300'
      />
    </div>
  );
}
