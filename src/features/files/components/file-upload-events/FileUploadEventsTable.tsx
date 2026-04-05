'use client';

import React, { useMemo } from 'react';

import { FilterPanel, StandardDataTablePanel } from '@/shared/ui/templates.public';
import { Pagination, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { RefreshButton } from '@/shared/ui/forms-and-actions.public';
import type { FilterField } from '@/shared/contracts/ui/panels';
import type { LabeledOptionDto } from '@/shared/contracts/base';

import { useFileUploadEventsPanelContext } from './context/FileUploadEventsPanelContext';
import { useFileUploadEventsContext } from '../../contexts/FileUploadEventsContext';
import { useFileUploadEventsTableProps } from '../../hooks/useFileUploadEventsTableProps';
import { resolveFileUploadEventsFilterUpdate } from './FileUploadEventsTable.helpers';

const FILE_UPLOAD_STATUS_OPTIONS: Array<LabeledOptionDto<'all' | 'success' | 'error'>> = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
];

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
        options: FILE_UPLOAD_STATUS_OPTIONS,
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
    const update = resolveFileUploadEventsFilterUpdate(key, value);
    if (!update) return;

    if (update.key === 'status') {
      setStatus(update.value);
      return;
    }

    const filterSetters = {
      category: setCategory,
      projectId: setProjectId,
      fromDate: setFromDate,
      toDate: setToDate,
    } as const;
    filterSetters[update.key](update.value);
  };

  const footer = (
    <div className='px-4 pb-2'>
      <Pagination
        variant='panel'
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
    <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
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
