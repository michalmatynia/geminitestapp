'use client';

import React from 'react';

import type { PanelRuntimeSlots } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils';

import { DataTable } from '../data-table';
import { ListPanel } from '../list-panel';
import { SectionHeader } from '../section-header';

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
  getRowId?: (row: TData) => string | number;
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

type StandardDataTablePanelRuntimeValue = PanelRuntimeSlots;

type StandardDataTablePanelGeneratedHeaderProps = {
  title?: string | undefined;
  description?: string | undefined;
  headerActions?: React.ReactNode | undefined;
  refresh?:
    | {
        onRefresh: () => void;
        isRefreshing: boolean;
      }
    | undefined;
};

export const StandardDataTablePanelRuntimeContext =
  React.createContext<StandardDataTablePanelRuntimeValue | null>(null);

function StandardDataTablePanelGeneratedHeader({
  title,
  description,
  headerActions,
  refresh,
}: StandardDataTablePanelGeneratedHeaderProps): React.JSX.Element | null {
  if (!title) return null;
  return (
    <SectionHeader
      title={title}
      description={description}
      actions={headerActions}
      refresh={refresh}
    />
  );
}

type StandardDataTablePanelRenderProps = {
  resolvedPanelHeader?: React.ReactNode | undefined;
  resolvedAlerts?: React.ReactNode | undefined;
  resolvedFilters?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  resolvedFooter?: React.ReactNode | undefined;
  className?: string | undefined;
  contentClassName?: string | undefined;
  variant?: 'default' | 'flat' | undefined;
  showPanelLoading: boolean;
  showTableLoading: boolean;
  loadingMessage?: string | undefined;
  emptyState?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
  table: {
    columns: ColumnDef<unknown, unknown>[];
    data: unknown[];
    showTableLoading: boolean;
    initialSorting?: SortingState | undefined;
    sortingStorageKey?: string | undefined;
    getRowId?: ((row: unknown) => string | number) | undefined;
    getSubRows?: ((row: unknown) => unknown[] | undefined) | undefined;
    getRowClassName?: ((row: Row<unknown>) => string | undefined) | undefined;
    maxHeight?: string | number | undefined;
    stickyHeader?: boolean | undefined;
    rowSelection?: import('@tanstack/react-table').RowSelectionState | undefined;
    onRowSelectionChange?:
      | import('@tanstack/react-table').OnChangeFn<
          import('@tanstack/react-table').RowSelectionState
        >
      | undefined;
    skeletonRows?: React.ReactNode | undefined;
    expanded?: ExpandedState | undefined;
    onExpandedChange?: OnChangeFn<ExpandedState> | undefined;
    renderRowDetails?: ((props: { row: Row<unknown> }) => React.ReactNode | undefined) | undefined;
    enableVirtualization?: boolean | undefined;
  };
};

function StandardDataTablePanelRender({
  actions,
  children,
  className,
  contentClassName,
  emptyState,
  loadingMessage,
  resolvedAlerts,
  resolvedFilters,
  resolvedFooter,
  resolvedPanelHeader,
  showPanelLoading,
  showTableLoading,
  table,
  variant,
}: StandardDataTablePanelRenderProps): React.JSX.Element {
  return (
    <ListPanel
      {...(resolvedPanelHeader !== undefined ? { header: resolvedPanelHeader } : {})}
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
          columns={table.columns}
          data={table.data}
          isLoading={showTableLoading}
          {...(emptyState !== undefined ? { emptyState } : {})}
          {...(table.initialSorting !== undefined ? { initialSorting: table.initialSorting } : {})}
          {...(table.sortingStorageKey !== undefined
            ? { sortingStorageKey: table.sortingStorageKey }
            : {})}
          {...(table.getRowId !== undefined ? { getRowId: table.getRowId } : {})}
          {...(table.getSubRows !== undefined ? { getSubRows: table.getSubRows } : {})}
          {...(table.getRowClassName !== undefined
            ? { getRowClassName: table.getRowClassName }
            : {})}
          {...(table.maxHeight !== undefined ? { maxHeight: table.maxHeight } : {})}
          {...(table.stickyHeader !== undefined ? { stickyHeader: table.stickyHeader } : {})}
          {...(table.rowSelection !== undefined ? { rowSelection: table.rowSelection } : {})}
          {...(table.onRowSelectionChange !== undefined
            ? { onRowSelectionChange: table.onRowSelectionChange }
            : {})}
          {...(table.skeletonRows !== undefined ? { skeletonRows: table.skeletonRows } : {})}
          {...(table.expanded !== undefined ? { expanded: table.expanded } : {})}
          {...(table.onExpandedChange !== undefined
            ? { onExpandedChange: table.onExpandedChange }
            : {})}
          {...(table.renderRowDetails !== undefined
            ? { renderRowDetails: table.renderRowDetails }
            : {})}
          enableVirtualization={table.enableVirtualization}
        />
      )}
    </ListPanel>
  );
}

/**
 * A standard UI pattern combining a ListPanel (with header, filters, footer)
 * and a DataTable. This reduces boilerplate in admin-style views.
 */
export function StandardDataTablePanel<TData>({
  title: panelTitle,
  description: panelDescription,
  headerActions: panelHeaderActions,
  header,
  refresh: panelRefresh,
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
  const hasGeneratedHeader = Boolean(
    panelTitle || panelDescription || panelHeaderActions || panelRefresh
  );
  const resolvedPanelHeader =
    resolvedHeader ??
    (hasGeneratedHeader ? (
      <StandardDataTablePanelGeneratedHeader
        title={panelTitle}
        description={panelDescription}
        headerActions={panelHeaderActions}
        refresh={panelRefresh}
      />
    ) : undefined);
  const showPanelLoading = isLoading && loadingVariant === 'panel';
  const showTableLoading = isLoading && loadingVariant === 'table';
  const tableProps: StandardDataTablePanelRenderProps['table'] = {
    columns: columns as ColumnDef<unknown, unknown>[],
    data: data as unknown[],
    showTableLoading,
    initialSorting,
    sortingStorageKey,
    getRowId: getRowId as ((row: unknown) => string | number) | undefined,
    getSubRows: getSubRows as ((row: unknown) => unknown[] | undefined) | undefined,
    getRowClassName: getRowClassName as ((row: Row<unknown>) => string | undefined) | undefined,
    maxHeight,
    stickyHeader,
    rowSelection,
    onRowSelectionChange,
    skeletonRows,
    expanded,
    onExpandedChange,
    renderRowDetails: renderRowDetails as
      | ((props: { row: Row<unknown> }) => React.ReactNode | undefined)
      | undefined,
    enableVirtualization,
  };

  return (
    <StandardDataTablePanelRender
      {...(resolvedPanelHeader !== undefined ? { resolvedPanelHeader } : {})}
      {...(resolvedAlerts !== undefined ? { resolvedAlerts } : {})}
      {...(resolvedFilters !== undefined ? { resolvedFilters } : {})}
      {...(actions !== undefined ? { actions } : {})}
      {...(resolvedFooter !== undefined ? { resolvedFooter } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(contentClassName !== undefined ? { contentClassName } : {})}
      {...(variant !== undefined ? { variant } : {})}
      showPanelLoading={showPanelLoading}
      showTableLoading={showTableLoading}
      {...(loadingMessage !== undefined ? { loadingMessage } : {})}
      {...(emptyState !== undefined ? { emptyState } : {})}
      {...(children !== undefined ? { children } : {})}
      table={tableProps}
    />
  );
}
