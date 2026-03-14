'use client';

import { X } from 'lucide-react';
import React, { useMemo } from 'react';

import { Input, SelectSimple, Button } from '@/shared/ui';

import { TAG_NONE, CAT_NONE } from './document-relation-search-utils';
import {
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
} from '../../context/DocumentRelationSearchContext';

export function FilterBar(): React.JSX.Element {
  const {
    caseTagOptions,
    caseCategoryOptions,
    dateFrom,
    dateTo,
    tagIdFilter,
    categoryIdFilter,
    filtersActiveCount,
  } = useDocumentRelationSearchStateContext();
  const { setDateFrom, setDateTo, setTagIdFilter, setCategoryIdFilter, resetFilters } =
    useDocumentRelationSearchActionsContext();

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
         aria-label="Input field" title="Input field"/>
      </div>
      <div className='flex items-center gap-1'>
        <span className='text-[10px] text-gray-500'>To:</span>
        <Input
          type='date'
          size='xs'
          className='w-[130px]'
          value={dateTo ?? ''}
          onChange={(e) => setDateTo(e.target.value || null)}
         aria-label="Input field" title="Input field"/>
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
       title="Any tag"/>
      <SelectSimple
        size='xs'
        variant='subtle'
        placeholder='Any category'
        value={categoryIdFilter ?? undefined}
        onValueChange={(v) => setCategoryIdFilter(v === CAT_NONE ? null : v)}
        options={catOpts}
        className='w-[130px]'
        ariaLabel='Filter by category'
       title="Any category"/>
      <div className='flex-1' />
      {filtersActiveCount > 0 && (
        <Button
          variant='ghost'
          size='xs'
          onClick={resetFilters}
          className='flex items-center gap-1 h-7 text-gray-400 hover:text-gray-200'
        >
          <X className='size-3' />
          Reset
        </Button>
      )}
    </div>
  );
}
