'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { DataTable } from '../data-table';
import { ListPanel } from '../list-panel';

import type { ColumnDef, ExpandedState, OnChangeFn, Row } from '@tanstack/react-table';

export interface StandardDataTablePanelProps<TData> {
  // ListPanel props
  title?: string | undefined;
  description?: string | undefined;
  headerActions?: React.ReactNode | undefined;
  header?: React.ReactNode | undefined;
  refresh?: {
    onRefresh: () => void;
    isRefreshing: boolean;
  } | undefined;
  alerts?: React.ReactNode | undefined;
  filters?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  footer?: React.ReactNode | undefined;
  className?: string | undefined;
  contentClassName?: string | undefined;
  variant?: 'default' | 'flat' | undefined;
  
  // DataTable props
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean | undefined;
  loadingMessage?: string | undefined;
  emptyState?: React.ReactNode | undefined;
  getRowId?: (row: TData) => string | number | undefined;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  maxHeight?: string | number | undefined;
  stickyHeader?: boolean | undefined;
  expanded?: ExpandedState | undefined;
  onExpandedChange?: OnChangeFn<ExpandedState> | undefined;
  renderRowDetails?: (props: { row: Row<TData> }) => React.ReactNode | undefined;
  
  /**
   * Whether to use the full ListPanel loading state (centered spinner) 
   * or the DataTable inline loading state (skeleton/spinner in table).
   * Defaults to 'panel' for true isLoading.
   */
  loadingVariant?: 'panel' | 'table' | undefined;
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
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(headerActions !== undefined ? { headerActions } : {})}
      {...(header !== undefined ? { header } : {})}
      {...(refresh !== undefined ? { refresh } : {})}
      {...(alerts !== undefined ? { alerts } : {})}
      {...(filters !== undefined ? { filters } : {})}
      {...(actions !== undefined ? { actions } : {})}
      {...(footer !== undefined ? { footer } : {})}
      {...(className !== undefined ? { className } : {})}
      contentClassName={cn('min-w-0', contentClassName)}
      {...(variant !== undefined ? { variant } : {})}
      isLoading={showPanelLoading}
      {...(loadingMessage !== undefined ? { loadingMessage } : {})}
      {...(emptyState !== undefined ? { emptyState } : {})}
    >
      <DataTable
        columns={columns}
        data={data}
        isLoading={showTableLoading}
        {...(emptyState !== undefined ? { emptyState } : {})}
        {...(getRowId !== undefined ? { getRowId: getRowId as (row: TData) => string | number } : {})}
        {...(getRowClassName !== undefined ? { getRowClassName } : {})}
        {...(maxHeight !== undefined ? { maxHeight } : {})}
        {...(stickyHeader !== undefined ? { stickyHeader } : {})}
        {...(expanded !== undefined ? { expanded } : {})}
        {...(onExpandedChange !== undefined ? { onExpandedChange } : {})}
        {...(renderRowDetails !== undefined ? { renderRowDetails } : {})}
      />
    </ListPanel>
  );
}
