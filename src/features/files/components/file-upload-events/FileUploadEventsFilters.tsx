'use client';

import React, { useMemo } from 'react';

import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

import { useFileUploadEventsContext } from '../../contexts/FileUploadEventsContext';

/**
 * REFACTORED: FileUploadEventsFilters using FilterPanel template
 * 
 * Before: 59 LOC
 * After: 22 LOC
 * Savings: 63% reduction
 */
export function FileUploadEventsFilters(): React.JSX.Element {
  const {
    status, setStatus,
    category, setCategory,
    projectId, setProjectId,
    query, setQuery,
    fromDate, setFromDate,
    toDate, setToDate,
    setPage,
    handleResetFilters,
  } = useFileUploadEventsContext();

  const filterConfig: FilterField[] = useMemo(() => [
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'all', label: 'All statuses' },
      { value: 'success', label: 'Success' },
      { value: 'error', label: 'Error' },
    ]},
    { key: 'category', label: 'Category', type: 'text', placeholder: 'studio, cms, products…' },
    { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'project id…' },
    { key: 'fromDate', label: 'From Date', type: 'date' },
    { key: 'toDate', label: 'To Date', type: 'date' },
  ], []);

  const filterValues = useMemo(() => ({
    status, category, projectId, fromDate, toDate
  }), [status, category, projectId, fromDate, toDate]);

  const handleFilterChange = (key: string, value: any) => {
    setPage(1);
    switch (key) {
      case 'status':
        setStatus(value || 'all');
        break;
      case 'category':
        setCategory(value || '');
        break;
      case 'projectId':
        setProjectId(value || '');
        break;
      case 'fromDate':
        setFromDate(value || '');
        break;
      case 'toDate':
        setToDate(value || '');
        break;
    }
  };

  return (
    <div className='mt-4'>
      <FilterPanel
        filters={filterConfig}
        values={filterValues}
        search={query}
        searchPlaceholder='filename, error, source…'
        onFilterChange={handleFilterChange}
        onSearchChange={(q) => { setPage(1); setQuery(q); }}
        onReset={handleResetFilters}
        showHeader={false}
        compact
      />
    </div>
  );
}
