'use client';

import React from 'react';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

export type StandardDataTablePanelRuntimeValue = {
  header?: React.ReactNode | undefined;
  alerts?: React.ReactNode | undefined;
  filters?: React.ReactNode | undefined;
  footer?: React.ReactNode | undefined;
};

type StandardDataTablePanelHeaderRuntimeValue = {
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

const {
  Context: StandardDataTablePanelHeaderRuntimeContext,
  useStrictContext: useStandardDataTablePanelHeaderRuntime,
} = createStrictContext<StandardDataTablePanelHeaderRuntimeValue>({
  hookName: 'useStandardDataTablePanelHeaderRuntime',
  providerName: 'StandardDataTablePanelHeaderRuntimeProvider',
  displayName: 'StandardDataTablePanelHeaderRuntimeContext',
});

function StandardDataTablePanelGeneratedHeader(): React.JSX.Element | null {
  const { title, description, headerActions, refresh } = useStandardDataTablePanelHeaderRuntime();
  if (!title) return null;
  return (
    <SectionHeader title={title} description={description} actions={headerActions} refresh={refresh} />
  );
}

type StandardDataTablePanelRenderRuntimeValue = {
  resolvedPanelHeader?: React.ReactNode | undefined;
  resolvedAlerts?: React.ReactNode | undefined;
  resolvedFilters?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  resolvedFooter?: React.ReactNode | undefined;
  className?: string | undefined;
  contentClassName?: string | undefined;
  variant?: 'default' | 'flat' | undefined;
  showPanelLoading: boolean;
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
      | import('@tanstack/react-table').OnChangeFn<import('@tanstack/react-table').RowSelectionState>
      | undefined;
    skeletonRows?: React.ReactNode | undefined;
    expanded?: ExpandedState | undefined;
    onExpandedChange?: OnChangeFn<ExpandedState> | undefined;
    renderRowDetails?: ((props: { row: Row<unknown> }) => React.ReactNode | undefined) | undefined;
    enableVirtualization?: boolean | undefined;
  };
};

const {
  Context: StandardDataTablePanelRenderRuntimeContext,
  useStrictContext: useStandardDataTablePanelRenderRuntime,
} = createStrictContext<StandardDataTablePanelRenderRuntimeValue>({
  hookName: 'useStandardDataTablePanelRenderRuntime',
  providerName: 'StandardDataTablePanelRenderRuntimeProvider',
  displayName: 'StandardDataTablePanelRenderRuntimeContext',
});

function StandardDataTablePanelRenderRuntime(): React.JSX.Element {
  const runtime = useStandardDataTablePanelRenderRuntime();
  const { table } = runtime;
  return (
    <ListPanel
      {...(runtime.resolvedPanelHeader !== undefined ? { header: runtime.resolvedPanelHeader } : {})}
      {...(runtime.resolvedAlerts !== undefined ? { alerts: runtime.resolvedAlerts } : {})}
      {...(runtime.resolvedFilters !== undefined ? { filters: runtime.resolvedFilters } : {})}
      {...(runtime.actions !== undefined ? { actions: runtime.actions } : {})}
      {...(runtime.resolvedFooter !== undefined ? { footer: runtime.resolvedFooter } : {})}
      {...(runtime.className !== undefined ? { className: runtime.className } : {})}
      contentClassName={cn('min-w-0', runtime.contentClassName)}
      {...(runtime.variant !== undefined ? { variant: runtime.variant } : {})}
      isLoading={runtime.showPanelLoading}
      {...(runtime.loadingMessage !== undefined ? { loadingMessage: runtime.loadingMessage } : {})}
      {...(runtime.emptyState !== undefined ? { emptyState: runtime.emptyState } : {})}
    >
      {runtime.children !== undefined ? (
        runtime.children
      ) : (
        <DataTable
          columns={table.columns}
          data={table.data}
          isLoading={table.showTableLoading}
          {...(runtime.emptyState !== undefined ? { emptyState: runtime.emptyState } : {})}
          {...(table.initialSorting !== undefined ? { initialSorting: table.initialSorting } : {})}
          {...(table.sortingStorageKey !== undefined ? { sortingStorageKey: table.sortingStorageKey } : {})}
          {...(table.getRowId !== undefined ? { getRowId: table.getRowId } : {})}
          {...(table.getSubRows !== undefined ? { getSubRows: table.getSubRows } : {})}
          {...(table.getRowClassName !== undefined ? { getRowClassName: table.getRowClassName } : {})}
          {...(table.maxHeight !== undefined ? { maxHeight: table.maxHeight } : {})}
          {...(table.stickyHeader !== undefined ? { stickyHeader: table.stickyHeader } : {})}
          {...(table.rowSelection !== undefined ? { rowSelection: table.rowSelection } : {})}
          {...(table.onRowSelectionChange !== undefined
            ? { onRowSelectionChange: table.onRowSelectionChange }
            : {})}
          {...(table.skeletonRows !== undefined ? { skeletonRows: table.skeletonRows } : {})}
          {...(table.expanded !== undefined ? { expanded: table.expanded } : {})}
          {...(table.onExpandedChange !== undefined ? { onExpandedChange: table.onExpandedChange } : {})}
          {...(table.renderRowDetails !== undefined ? { renderRowDetails: table.renderRowDetails } : {})}
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
  const headerRuntimeValue = React.useMemo<StandardDataTablePanelHeaderRuntimeValue>(
    () => ({
      title: panelTitle,
      description: panelDescription,
      headerActions: panelHeaderActions,
      refresh: panelRefresh,
    }),
    [panelDescription, panelHeaderActions, panelRefresh, panelTitle]
  );
  const resolvedPanelHeader =
    resolvedHeader ??
    (hasGeneratedHeader ? <StandardDataTablePanelGeneratedHeader /> : undefined);
  const showPanelLoading = isLoading && loadingVariant === 'panel';
  const showTableLoading = isLoading && loadingVariant === 'table';
  const renderRuntimeValue = React.useMemo<StandardDataTablePanelRenderRuntimeValue>(
    () => ({
      resolvedPanelHeader,
      resolvedAlerts,
      resolvedFilters,
      actions,
      resolvedFooter,
      className,
      contentClassName,
      variant,
      showPanelLoading,
      loadingMessage,
      emptyState,
      children,
      table: {
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
      },
    }),
    [
      actions,
      children,
      className,
      columns,
      contentClassName,
      data,
      emptyState,
      enableVirtualization,
      expanded,
      getRowClassName,
      getRowId,
      getSubRows,
      initialSorting,
      loadingMessage,
      maxHeight,
      onExpandedChange,
      onRowSelectionChange,
      renderRowDetails,
      resolvedAlerts,
      resolvedFilters,
      resolvedFooter,
      resolvedPanelHeader,
      rowSelection,
      showPanelLoading,
      showTableLoading,
      skeletonRows,
      sortingStorageKey,
      stickyHeader,
      variant,
    ]
  );

  return (
    <StandardDataTablePanelHeaderRuntimeContext.Provider value={headerRuntimeValue}>
      <StandardDataTablePanelRenderRuntimeContext.Provider value={renderRuntimeValue}>
        <StandardDataTablePanelRenderRuntime />
      </StandardDataTablePanelRenderRuntimeContext.Provider>
    </StandardDataTablePanelHeaderRuntimeContext.Provider>
  );
}
