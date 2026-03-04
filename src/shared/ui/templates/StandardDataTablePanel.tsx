'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { DataTable } from '../data-table';
import { ListPanel } from '../list-panel';

import type {
  ColumnDef,
  ExpandedState,
  OnChangeFn,
  Row,
  SortingState,
} from '@tanstack/react-table';

export interface StandardDataTablePanelProps<TData> {
  // ListPanel props
  title?: string | undefined;
  description?: string | undefined;
  headerActions?: React.ReactNode | undefined;
  header?: React.ReactNode | undefined;
  refresh?:
    | {
        onRefresh: () => void;
        isRefreshing: boolean;
      }
    | undefined;
  alerts?: React.ReactNode | undefined;
  filters?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  footer?: React.ReactNode | undefined;
  className?: string | undefined;
  contentClassName?: string | undefined;
  variant?: 'default' | 'flat' | undefined;

  // DataTable props
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean | undefined;
  loadingMessage?: string | undefined;
  emptyState?: React.ReactNode | undefined;
  initialSorting?: SortingState | undefined;
  sortingStorageKey?: string | undefined;
  getRowId?: (row: TData) => string | number | undefined;
  getSubRows?: (row: TData) => TData[] | undefined;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  maxHeight?: string | number | undefined;
  stickyHeader?: boolean | undefined;
  rowSelection?: import('@tanstack/react-table').RowSelectionState | undefined;
  onRowSelectionChange?:
    | import('@tanstack/react-table').OnChangeFn<import('@tanstack/react-table').RowSelectionState>
    | undefined;
  skeletonRows?: React.ReactNode | undefined;
  expanded?: ExpandedState | undefined;
  onExpandedChange?: OnChangeFn<ExpandedState> | undefined;
  renderRowDetails?: (props: { row: Row<TData> }) => React.ReactNode | undefined;
  enableVirtualization?: boolean | undefined;

  /**
   * Whether to use the full ListPanel loading state (centered spinner)
   * or the DataTable inline loading state (skeleton/spinner in table).
   * Defaults to 'panel' for true isLoading.
   */
  loadingVariant?: 'panel' | 'table' | undefined;

  /**
   * Optional custom content to render instead of the default DataTable.
   * If provided, columns and data props are still accepted but the table won't render.
   */
  children?: React.ReactNode | undefined;
}

export type StandardDataTablePanelRuntimeValue = {
  header?: React.ReactNode | undefined;
  alerts?: React.ReactNode | undefined;
  filters?: React.ReactNode | undefined;
  footer?: React.ReactNode | undefined;
};

export const StandardDataTablePanelRuntimeContext =
  React.createContext<StandardDataTablePanelRuntimeValue | null>(null);

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
  initialSorting,
  sortingStorageKey,
  getRowId,
  getSubRows,
  getRowClassName,
  maxHeight,
  stickyHeader,
  rowSelection,
  onRowSelectionChange,
  skeletonRows,
  expanded,
  onExpandedChange,
  renderRowDetails,
  enableVirtualization,
  loadingVariant = 'panel',
  children,
}: StandardDataTablePanelProps<TData>): React.JSX.Element {
  const runtime = React.useContext(StandardDataTablePanelRuntimeContext);
  const resolvedHeader = header ?? runtime?.header;
  const resolvedAlerts = alerts ?? runtime?.alerts;
  const resolvedFilters = filters ?? runtime?.filters;
  const resolvedFooter = footer ?? runtime?.footer;
  const showPanelLoading = isLoading && loadingVariant === 'panel';
  const showTableLoading = isLoading && loadingVariant === 'table';

  return (
    <ListPanel
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(headerActions !== undefined ? { headerActions } : {})}
      {...(resolvedHeader !== undefined ? { header: resolvedHeader } : {})}
      {...(refresh !== undefined ? { refresh } : {})}
      {...(resolvedAlerts !== undefined ? { alerts: resolvedAlerts } : {})}
      {...(resolvedFilters !== undefined ? { filters: resolvedFilters } : {})}
      {...(actions !== undefined ? { actions } : {})}
      {...(resolvedFooter !== undefined ? { footer: resolvedFooter } : {})}
      {...(className !== undefined ? { className } : {})}
      contentClassName={cn('min-w-0', contentClassName)}
      {...(variant !== undefined ? { variant } : {})}
      isLoading={showPanelLoading}
      {...(loadingMessage !== undefined ? { loadingMessage } : {})}
      {...(emptyState !== undefined ? { emptyState } : {})}
    >
      {children !== undefined ? (
        children
      ) : (
        <DataTable
          columns={columns}
          data={data}
          isLoading={showTableLoading}
          {...(emptyState !== undefined ? { emptyState } : {})}
          {...(initialSorting !== undefined ? { initialSorting } : {})}
          {...(sortingStorageKey !== undefined ? { sortingStorageKey } : {})}
          {...(getRowId !== undefined
            ? { getRowId: getRowId as (row: TData) => string | number }
            : {})}
          {...(getSubRows !== undefined ? { getSubRows } : {})}
          {...(getRowClassName !== undefined ? { getRowClassName } : {})}
          {...(maxHeight !== undefined ? { maxHeight } : {})}
          {...(stickyHeader !== undefined ? { stickyHeader } : {})}
          {...(rowSelection !== undefined ? { rowSelection } : {})}
          {...(onRowSelectionChange !== undefined ? { onRowSelectionChange } : {})}
          {...(skeletonRows !== undefined ? { skeletonRows } : {})}
          {...(expanded !== undefined ? { expanded } : {})}
          {...(onExpandedChange !== undefined ? { onExpandedChange } : {})}
          {...(renderRowDetails !== undefined ? { renderRowDetails } : {})}
          enableVirtualization={enableVirtualization}
        />
      )}
    </ListPanel>
  );
}
