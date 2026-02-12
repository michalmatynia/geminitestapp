'use client';

import React from 'react';

import { DynamicFilters, type FilterField } from '@/shared/ui';

import { useFileUploadEventsContext } from '../../contexts/FileUploadEventsContext';

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
] as const;

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

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [...statusOptions] },
    { key: 'category', label: 'Category', type: 'text', placeholder: 'studio, cms, products…' },
    { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'project id…' },
    { key: 'query', label: 'Search', type: 'text', placeholder: 'filename, error, source…' },
    { key: 'fromDate', label: 'From', type: 'date' },
    { key: 'toDate', label: 'To', type: 'date' },
  ];

  const handleFilterChange = (key: string, value: string | string[]): void => {
    const normalizedValue = Array.isArray(value) ? (value[0] ?? '') : value;
    setPage(1);
    if (key === 'status') setStatus(normalizedValue as 'all' | 'success' | 'error');
    if (key === 'category') setCategory(normalizedValue);
    if (key === 'projectId') setProjectId(normalizedValue);
    if (key === 'query') setQuery(normalizedValue);
    if (key === 'fromDate') setFromDate(normalizedValue);
    if (key === 'toDate') setToDate(normalizedValue);
  };

  return (
    <div className='mt-4'>
      <DynamicFilters
        fields={filterFields}
        values={{ status, category, projectId, query, fromDate, toDate }}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        hasActiveFilters={Boolean(status !== 'all' || category || projectId || query || fromDate || toDate)}
        gridClassName='md:grid-cols-4 lg:grid-cols-6'
      />
    </div>
  );
}
