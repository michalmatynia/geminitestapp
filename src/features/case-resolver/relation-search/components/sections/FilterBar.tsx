'use client';

import React, { useMemo } from 'react';

import { FilterPanel } from '@/shared/ui';
import type { FilterField } from '@/shared/contracts/ui';

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
  } = useDocumentRelationSearchStateContext();
  const { setDateFrom, setDateTo, setTagIdFilter, setCategoryIdFilter, resetFilters } =
    useDocumentRelationSearchActionsContext();

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: 'dateFrom',
        label: 'From',
        type: 'date',
      },
      {
        key: 'dateTo',
        label: 'To',
        type: 'date',
      },
      {
        key: 'tagId',
        label: 'Tag',
        type: 'select',
        options: [{ value: TAG_NONE, label: 'Any tag' }, ...caseTagOptions],
      },
      {
        key: 'categoryId',
        label: 'Category',
        type: 'select',
        options: [{ value: CAT_NONE, label: 'Any category' }, ...caseCategoryOptions],
      },
    ],
    [caseTagOptions, caseCategoryOptions]
  );

  const filterValues = useMemo(
    () => ({
      dateFrom: dateFrom ?? '',
      dateTo: dateTo ?? '',
      tagId: tagIdFilter ?? TAG_NONE,
      categoryId: categoryIdFilter ?? CAT_NONE,
    }),
    [dateFrom, dateTo, tagIdFilter, categoryIdFilter]
  );

  return (
    <FilterPanel
      filters={filterFields}
      values={filterValues}
      onFilterChange={(key, val) => {
        const value = typeof val === 'string' ? (val.length > 0 ? val : null) : null;
        if (key === 'dateFrom') setDateFrom(value);
        if (key === 'dateTo') setDateTo(value);
        if (key === 'tagId') setTagIdFilter(val === TAG_NONE ? null : (val as string));
        if (key === 'categoryId') setCategoryIdFilter(val === CAT_NONE ? null : (val as string));
      }}
      onReset={resetFilters}
      showHeader={false}
      compact
      className='border-b border-border/40 bg-card/10'
    />
  );
}
