'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { DataTable } from '../data-table';
import { ListPanel } from '../list-panel';

import type { ColumnDef, ExpandedState, OnChangeFn, Row } from '@tanstack/react-table';

export interface StandardDataTablePanelProps<TData> {
  // ListPanel props
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
  header?: React.ReactNode;
  refresh?: {
    onRefresh: () => void;
    isRefreshing: boolean;
  };
  alerts?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: 'default' | 'flat';
  
  // DataTable props
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  loadingMessage?: string;
  emptyState?: React.ReactNode;
  getRowId?: (row: TData) => string;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  maxHeight?: string | number;
  stickyHeader?: boolean;
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
  renderRowDetails?: (props: { row: Row<TData> }) => React.ReactNode;
  
  /**
   * Whether to use the full ListPanel loading state (centered spinner) 
   * or the DataTable inline loading state (skeleton/spinner in table).
   * Defaults to 'panel' for true isLoading.
   */
  loadingVariant?: 'panel' | 'table';
}

/**
 * A standard UI pattern combining a ListPanel (with header, filters, footer)
 * and a DataTable. This reduces boilerplate in admin-style views.
 */
export function StandardDataTablePanel<TData>({
  title,
  description,
  headerActions,
  header,
  refresh,
  alerts,
  filters,
  actions,
  footer,
  className,
  contentClassName,
  variant,
  
  columns,
  data,
  isLoading = false,
  loadingMessage,
  emptyState,
  getRowId,
  getRowClassName,
  maxHeight,
  stickyHeader,
  expanded,
  onExpandedChange,
  renderRowDetails,
  loadingVariant = 'panel',
}: StandardDataTablePanelProps<TData>): React.JSX.Element {
  const showPanelLoading = isLoading && loadingVariant === 'panel';
  const showTableLoading = isLoading && loadingVariant === 'table';

  return (
    <ListPanel
      title={title}
      description={description}
      headerActions={headerActions}
      header={header}
      refresh={refresh}
      alerts={alerts}
      filters={filters}
      actions={actions}
      footer={footer}
      className={className}
      contentClassName={cn('min-w-0', contentClassName)}
      variant={variant}
      isLoading={showPanelLoading}
      loadingMessage={loadingMessage}
      emptyState={emptyState}
    >
      <DataTable
        columns={columns}
        data={data}
        isLoading={showTableLoading}
        emptyState={emptyState}
        getRowId={getRowId}
        getRowClassName={getRowClassName}
        maxHeight={maxHeight}
        stickyHeader={stickyHeader}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        renderRowDetails={renderRowDetails}
      />
    </ListPanel>
  );
}
