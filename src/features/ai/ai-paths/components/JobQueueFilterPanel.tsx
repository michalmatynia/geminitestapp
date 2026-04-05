'use client';

import React, { useMemo } from 'react';

import { FilterPanel } from '@/shared/ui/templates.public';
import type { FilterField } from '@/shared/contracts/ui';

import { useJobQueueActions, useJobQueueState } from './JobQueueContext';

const PAGE_SIZES = [10, 25, 50];
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'dead_lettered', label: 'Dead-lettered' },
];

export function JobQueueFilterPanel(): React.JSX.Element {
  const { pathFilter, statusFilter, pageSize, searchQuery } = useJobQueueState();
  const { setPathFilter, setStatusFilter, setPageSize, setSearchQuery } = useJobQueueActions();

  const filterConfig = useMemo<FilterField[]>(
    () => [
      {
        key: 'pathId',
        label: 'Path ID',
        type: 'text',
        placeholder: 'All paths',
        width: '20rem',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: STATUS_FILTERS,
        width: '14rem',
      },
      {
        key: 'pageSize',
        label: 'Page Size',
        type: 'select',
        options: PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) })),
        width: '10rem',
      },
    ],
    []
  );

  const filterValues = useMemo(
    () => ({
      pathId: pathFilter,
      status: statusFilter,
      pageSize: String(pageSize),
    }),
    [pathFilter, statusFilter, pageSize]
  );

  const handleFilterChange = (key: string, value: unknown) => {
    if (key === 'pathId') setPathFilter(String(value));
    if (key === 'status') setStatusFilter(String(value));
    if (key === 'pageSize') setPageSize(Number(value));
  };

  const handleResetFilters = () => {
    setPathFilter('');
    setStatusFilter('all');
    setPageSize(25);
    setSearchQuery('');
  };

  return (
    <FilterPanel
      filters={filterConfig}
      values={filterValues}
      onFilterChange={handleFilterChange}
      search={searchQuery}
      onSearchChange={setSearchQuery}
      onReset={handleResetFilters}
      headerTitle='Job Queue Filters'
      searchPlaceholder='Run ID, path name, entity, error...'
    />
  );
}
