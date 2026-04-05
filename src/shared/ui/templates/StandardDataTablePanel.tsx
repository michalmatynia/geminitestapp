'use client';

import React from 'react';

import type { PanelRuntimeSlots } from '@/shared/contracts/ui/ui/controls';
import { cn } from '@/shared/utils/ui-utils';

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
  variant?: 'default' | 'flat' | 'embedded' | undefined;

  // DataTable props
  columns?: ColumnDef<TData, unknown>[] | undefined;
  data?: TData[] | undefined;
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
   * Whether to render the DataTable. Useful when custom children are provided
   * that handle their own table/list rendering or when used with responsive wrappers.
   * Defaults to true.
   */
  showTable?: boolean | undefined;

  /**
   * Optional custom content to render alongside or instead of the DataTable.
   */
  children?: React.ReactNode | undefined;
}

type StandardDataTablePanelRuntimeValue = PanelRuntimeSlots;

export const StandardDataTablePanelRuntimeContext =
  React.createContext<StandardDataTablePanelRuntimeValue | null>(null);

type StandardDataTablePanelShellProps = {
  actions: React.ReactNode | undefined;
  alerts: React.ReactNode | undefined;
  className: string | undefined;
  contentClassName: string | undefined;
  emptyState: React.ReactNode | undefined;
  filters: React.ReactNode | undefined;
  footer: React.ReactNode | undefined;
  header: React.ReactNode | undefined;
  isLoading: boolean;
  loadingMessage: string | undefined;
  variant: 'default' | 'flat' | 'embedded' | undefined;
};

interface StandardDataTablePanelTableProps<TData> {
  columns: ColumnDef<TData, unknown>[] | undefined;
  data: TData[] | undefined;
  enableVirtualization: boolean | undefined;
  emptyState: React.ReactNode | undefined;
  expanded: ExpandedState | undefined;
  getRowClassName: ((row: Row<TData>) => string | undefined) | undefined;
  getRowId: ((row: TData) => string | number) | undefined;
  getSubRows: ((row: TData) => TData[] | undefined) | undefined;
  initialSorting: SortingState | undefined;
  isLoading: boolean;
  maxHeight: string | number | undefined;
  onExpandedChange: OnChangeFn<ExpandedState> | undefined;
  onRowSelectionChange:
    | import('@tanstack/react-table').OnChangeFn<import('@tanstack/react-table').RowSelectionState>
    | undefined;
  renderRowDetails: ((props: { row: Row<TData> }) => React.ReactNode | undefined) | undefined;
  rowSelection: import('@tanstack/react-table').RowSelectionState | undefined;
  skeletonRows: React.ReactNode | undefined;
  sortingStorageKey: string | undefined;
  stickyHeader: boolean | undefined;
}

interface StandardDataTablePanelRenderProps<TData> {
  children: React.ReactNode | undefined;
  shellProps: StandardDataTablePanelShellProps;
  tableProps: StandardDataTablePanelTableProps<TData>;
  showTable?: boolean | undefined;
}

const renderStandardDataTable = <TData,>({
  columns,
  data,
  enableVirtualization,
  emptyState,
  expanded,
  getRowClassName,
  getRowId,
  getSubRows,
  initialSorting,
  isLoading,
  maxHeight,
  onExpandedChange,
  onRowSelectionChange,
  renderRowDetails,
  rowSelection,
  skeletonRows,
  sortingStorageKey,
  stickyHeader,
}: StandardDataTablePanelTableProps<TData>): React.JSX.Element => (
  <DataTable
    columns={columns ?? []}
    data={data ?? []}
    isLoading={isLoading}
    emptyState={emptyState}
    initialSorting={initialSorting}
    sortingStorageKey={sortingStorageKey}
    getRowId={getRowId}
    getSubRows={getSubRows}
    getRowClassName={getRowClassName}
    maxHeight={maxHeight}
    stickyHeader={stickyHeader}
    rowSelection={rowSelection}
    onRowSelectionChange={onRowSelectionChange}
    skeletonRows={skeletonRows}
    expanded={expanded}
    onExpandedChange={onExpandedChange}
    renderRowDetails={renderRowDetails}
    enableVirtualization={enableVirtualization}
  />
);

const renderStandardDataTablePanelHeader = ({
  header,
  panelDescription,
  panelHeaderActions,
  panelRefresh,
  panelTitle,
}: {
  header: React.ReactNode | undefined;
  panelDescription: string | undefined;
  panelHeaderActions: React.ReactNode | undefined;
  panelRefresh:
    | {
        onRefresh: () => void;
        isRefreshing: boolean;
      }
    | undefined;
  panelTitle: string | undefined;
}): React.ReactNode | undefined => {
  if (header !== undefined) {
    return header;
  }

  if (!(panelTitle || panelDescription || panelHeaderActions || panelRefresh)) {
    return undefined;
  }

  return panelTitle ? (
    <SectionHeader
      title={panelTitle}
      description={panelDescription}
      actions={panelHeaderActions}
      refresh={panelRefresh}
    />
  ) : null;
};

const renderStandardDataTablePanel = <TData,>({
  children,
  shellProps,
  tableProps,
  showTable = true,
}: StandardDataTablePanelRenderProps<TData>): React.JSX.Element => (
  <ListPanel
    {...(shellProps.header !== undefined ? { header: shellProps.header } : {})}
    {...(shellProps.alerts !== undefined ? { alerts: shellProps.alerts } : {})}
    {...(shellProps.filters !== undefined ? { filters: shellProps.filters } : {})}
    {...(shellProps.actions !== undefined ? { actions: shellProps.actions } : {})}
    {...(shellProps.footer !== undefined ? { footer: shellProps.footer } : {})}
    {...(shellProps.className !== undefined ? { className: shellProps.className } : {})}
    contentClassName={cn('min-w-0', shellProps.contentClassName)}
    {...(shellProps.variant !== undefined
      ? { variant: shellProps.variant === 'embedded' ? 'flat' : shellProps.variant }
      : {})}
    isLoading={shellProps.isLoading}
    {...(shellProps.loadingMessage !== undefined ? { loadingMessage: shellProps.loadingMessage } : {})}
    {...(shellProps.emptyState !== undefined ? { emptyState: shellProps.emptyState } : {})}
  >
    {children}
    {showTable && tableProps.columns && tableProps.data
      ? renderStandardDataTable(tableProps)
      : null}
  </ListPanel>
);

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
  showTable = true,
  children,
}: StandardDataTablePanelProps<TData>): React.JSX.Element {
  const runtime = React.useContext(StandardDataTablePanelRuntimeContext);
  const resolvedHeader = header ?? runtime?.header;
  const resolvedAlerts = alerts ?? runtime?.alerts;
  const resolvedFilters = filters ?? runtime?.filters;
  const resolvedFooter = footer ?? runtime?.footer;
  const resolvedPanelHeader = renderStandardDataTablePanelHeader({
    header: resolvedHeader,
    panelDescription,
    panelHeaderActions,
    panelRefresh,
    panelTitle,
  });
  const showPanelLoading = isLoading && loadingVariant === 'panel';
  const showTableLoading = isLoading && loadingVariant === 'table';

  return renderStandardDataTablePanel({
    children,
    showTable,
    shellProps: {
      actions,
      alerts: resolvedAlerts,
      className,
      contentClassName,
      emptyState,
      filters: resolvedFilters,
      footer: resolvedFooter,
      header: resolvedPanelHeader,
      isLoading: showPanelLoading,
      loadingMessage,
      variant,
    },
    tableProps: {
      columns,
      data,
      enableVirtualization,
      emptyState,
      expanded,
      getRowClassName,
      getRowId,
      getSubRows,
      initialSorting,
      isLoading: showTableLoading,
      maxHeight,
      onExpandedChange,
      onRowSelectionChange,
      renderRowDetails,
      rowSelection,
      skeletonRows,
      sortingStorageKey,
      stickyHeader,
    },
  });
}
