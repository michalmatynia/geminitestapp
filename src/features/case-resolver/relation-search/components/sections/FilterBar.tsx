'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { Input, SelectSimple } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';
import { TAG_NONE, CAT_NONE } from './document-relation-search-utils';

export function FilterBar(): React.JSX.Element {
  const {
    caseTagOptions,
    caseCategoryOptions,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    tagIdFilter,
    setTagIdFilter,
    categoryIdFilter,
    setCategoryIdFilter,
    filtersActiveCount,
    resetFilters,
  } = useDocumentRelationSearchContext();

  const tagOpts = useMemo(
    () => [{ value: TAG_NONE, label: 'Any tag' }, ...caseTagOptions],
    [caseTagOptions]
  );
  const catOpts = useMemo(
    () => [{ value: CAT_NONE, label: 'Any category' }, ...caseCategoryOptions],
    [caseCategoryOptions]
  );

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border/40 bg-card/10 px-3 py-1.5'>
      <div className='flex items-center gap-1'>
        <span className='text-[10px] text-gray-500'>From:</span>
        <Input
          type='date'
          size='xs'
          className='w-[130px]'
          value={dateFrom ?? ''}
          onChange={(e) => setDateFrom(e.target.value || null)}
        />
      </div>
      <div className='flex items-center gap-1'>
        <span className='text-[10px] text-gray-500'>To:</span>
        <Input
          type='date'
          size='xs'
          className='w-[130px]'
          value={dateTo ?? ''}
          onChange={(e) => setDateTo(e.target.value || null)}
        />
      </div>
      <SelectSimple
        size='xs'
        variant='subtle'
        placeholder='Any tag'
        value={tagIdFilter ?? undefined}
        onValueChange={(v) => setTagIdFilter(v === TAG_NONE ? null : v)}
        options={tagOpts}
        className='w-[130px]'
        ariaLabel='Filter by tag'
      />
      <SelectSimple
        size='xs'
        variant='subtle'
        placeholder='Any category'
        value={categoryIdFilter ?? undefined}
        onValueChange={(v) => setCategoryIdFilter(v === CAT_NONE ? null : v)}
        options={catOpts}
        className='w-[130px]'
        ariaLabel='Filter by category'
      />
      <div className='flex-1' />
      {filtersActiveCount > 0 && (
        <button
          type='button'
          onClick={resetFilters}
          className='flex items-center gap-1 rounded border border-border/40 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:border-border hover:text-gray-200'
        >
          <X className='size-3' />
          Reset
        </button>
      )}
    </div>
  );
}
