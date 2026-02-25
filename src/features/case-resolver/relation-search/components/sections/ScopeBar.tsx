'use client';

import React from 'react';
import { AlignJustify, List, ListPlus, SlidersHorizontal } from 'lucide-react';
import { SelectSimple, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { 
  useDocumentRelationSearchContext, 
  type ResultHeight 
} from '../../context/DocumentRelationSearchContext';
import { 
  type DocumentRelationFileTypeFilter, 
  type DocumentRelationSortMode 
} from '../../hooks/useDocumentRelationSearch';
import { getCaseResolverDocTooltip } from '../../utils/docs';

const SORT_OPTIONS: { value: DocumentRelationSortMode; label: string }[] = [
  { value: 'name_asc', label: 'Name A→Z' },
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'folder_asc', label: 'Folder A→Z' },
];

const FILE_TYPE_CHIPS: { key: DocumentRelationFileTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'document', label: 'Documents' },
  { key: 'scanfile', label: 'Scans' },
];

export function ScopeBar({
  showFileTypeFilter,
  showSortControl,
}: {
  showFileTypeFilter: boolean;
  showSortControl: boolean;
}): React.JSX.Element {
  const {
    documentSearchScope,
    setDocumentSearchScope,
    setSelectedDrillCaseId,
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

  const isCurrentCase = documentSearchScope === 'case_scope';
  const isAllCases = documentSearchScope === 'all_cases';

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border/60 bg-card/30 px-3 py-2'>
      <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
        <button
          type='button'
          onClick={() => {
            setDocumentSearchScope('case_scope');
            setSelectedDrillCaseId(null);
          }}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            isCurrentCase ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-400 hover:text-gray-200'
          )}
        >
          Current Case
        </button>
        <button
          type='button'
          onClick={() => setDocumentSearchScope('all_cases')}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            isAllCases ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-400 hover:text-gray-200'
          )}
        >
          All Cases
        </button>
      </div>

      {showFileTypeFilter && (
        <div className='flex items-center gap-1'>
          {FILE_TYPE_CHIPS.map(({ key, label }) => (
            <button
              key={key}
              type='button'
              onClick={() => setFileTypeFilter(key)}
              className={cn(
                'rounded border px-2 py-0.5 text-xs transition-colors',
                fileTypeFilter === key
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                  : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <Tooltip content={getCaseResolverDocTooltip('advancedFilters')} side='bottom'>
        <button
          type='button'
          onClick={() => setShowFiltersBar((p) => !p)}
          className={cn(
            'relative flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors',
            showFiltersBar
              ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
              : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
          )}
        >
          <SlidersHorizontal className='size-3' />
          Filters
          {filtersActiveCount > 0 && (
            <span className='absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-black'>
              {filtersActiveCount}
            </span>
          )}
        </button>
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

      <div className='flex items-center gap-0.5 rounded border border-border/40 bg-card/40 p-0.5'>
        {(
          [
            { key: 'compact', Icon: AlignJustify, label: 'Compact view' },
            { key: 'normal', Icon: List, label: 'Normal view' },
            { key: 'expanded', Icon: ListPlus, label: 'Expanded view' },
          ] as { key: ResultHeight; Icon: React.ComponentType<{ className?: string }>; label: string }[]
        ).map(({ key, Icon, label }) => (
          <Tooltip key={key} content={label} side='bottom'>
            <button
              type='button'
              onClick={() => setResultHeight(key)}
              className={cn(
                'flex items-center justify-center rounded p-1 transition-colors',
                resultHeight === key
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-gray-500 hover:bg-card/60 hover:text-gray-300'
              )}
            >
              <Icon className='size-3' />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
