'use client';

import React, { useMemo } from 'react';

import { StandardDataTablePanel, PanelPagination, RefreshButton, FilterPanel } from '@/shared/ui';
import type { FilterField } from '@/shared/ui/templates/panels';

import { useFileUploadEventsTableProps } from '../../hooks/useFileUploadEventsTableProps';
import { useFileUploadEventsContext } from '../../contexts/FileUploadEventsContext';
import { useFileUploadEventsPanelContext } from './context/FileUploadEventsPanelContext';

export function FileUploadEventsTable(): React.JSX.Element {
  const tableProps = useFileUploadEventsTableProps();
  const { title, description } = useFileUploadEventsPanelContext();
  const {
    total,
    refetch,
    isFetching,
    page,
    setPage,
    pageSize,
    setPageSize,
    status,
    setStatus,
    category,
    setCategory,
    projectId,
    setProjectId,
    query,
    setQuery,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    handleResetFilters,
  } = useFileUploadEventsContext();

  const filterConfig: FilterField[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'success', label: 'Success' },
          { value: 'error', label: 'Error' },
        ],
      },
      { key: 'category', label: 'Category', type: 'text', placeholder: 'studio, cms, products…' },
      { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'project id…' },
      { key: 'fromDate', label: 'From Date', type: 'date' },
      { key: 'toDate', label: 'To Date', type: 'date' },
    ],
    []
  );

  const filterValues = useMemo(
    () => ({
      status,
      category,
      projectId,
      fromDate,
      toDate,
    }),
    [status, category, projectId, fromDate, toDate]
  );

  const handleFilterChange = (key: string, value: unknown) => {
    setPage(1);
    switch (key) {
      case 'status':
        setStatus(value === 'error' || value === 'success' || value === 'all' ? value : 'all');
        break;
      case 'category':
        setCategory(typeof value === 'string' ? value : '');
        break;
      case 'projectId':
        setProjectId(typeof value === 'string' ? value : '');
        break;
      case 'fromDate':
        setFromDate(typeof value === 'string' ? value : '');
        break;
      case 'toDate':
        setToDate(typeof value === 'string' ? value : '');
        break;
    }
  };

  const footer = (
    <div className='px-4 pb-2'>
      <PanelPagination
        page={page}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
        isLoading={isFetching}
      />
    </div>
  );

  const filters = (
    <FilterPanel
      filters={filterConfig}
      values={filterValues}
      search={query}
      searchPlaceholder='filename, error, source…'
      onFilterChange={handleFilterChange}
      onSearchChange={(q) => {
        setPage(1);
        setQuery(q);
      }}
      onReset={handleResetFilters}
      showHeader={false}
      compact
    />
  );

  const actions = (
    <div className='flex items-center gap-3'>
      <div className='text-[11px] text-gray-500'>
        Total: <span className='text-gray-300'>{total}</span>
      </div>
      <RefreshButton
        onRefresh={(): void => {
          void refetch();
        }}
        isRefreshing={isFetching}
      />
    </div>
  );

  return (
    <StandardDataTablePanel
      {...tableProps}
      title={title}
      description={description}
      filters={filters}
      footer={footer}
      actions={actions}
      variant='flat'
    />
  );
}
