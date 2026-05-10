'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { ColumnDef, ExpandedState, Row, Table } from '@tanstack/react-table';
import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products/orders-import';
import {
  formatOrderDate,
  formatOrderTotal,
  IMPORT_STATE_LABELS,
  IMPORT_STATE_VARIANTS,
} from './AdminProductOrdersImportPage.utils';

interface BuildColumnsOptions {
  expanded: ExpandedState;
  handleToggleExpanded: (orderId: string) => void;
  onToggleExpanded?: (orderId: string) => void;
  isPreviewStale: boolean;
}

type OrderPreviewRow = Row<BaseOrderImportPreviewItem>;

const resolveSelectAllChecked = (
  table: Table<BaseOrderImportPreviewItem>
): boolean | 'indeterminate' => {
  if (table.getIsAllPageRowsSelected()) {
    return true;
  }
  return table.getIsSomePageRowsSelected() ? 'indeterminate' : false;
};

const renderExternalOrderNumber = (orderNumber: string | null | undefined): string =>
  typeof orderNumber === 'string' && orderNumber.length > 0
    ? `Order no. ${orderNumber}`
    : 'No external order number';

const renderLastImportedAt = (lastImportedAt: string | null | undefined): string =>
  typeof lastImportedAt === 'string' && lastImportedAt.length > 0
    ? `Last import ${formatOrderDate(lastImportedAt)}`
    : 'Not imported yet';

const isOrderExpanded = (expanded: ExpandedState, orderId: string): boolean => {
  if (expanded === true) return true;
  return expanded[orderId] === true;
};

const buildExpandColumn = ({
  expanded,
  handleToggleExpanded,
  onToggleExpanded,
}: BuildColumnsOptions): ColumnDef<BaseOrderImportPreviewItem> => ({
  id: 'expand',
  header: () => null,
  cell: ({ row }: { row: OrderPreviewRow }) => {
    const isExpanded = isOrderExpanded(expanded, row.original.baseOrderId);
    return (
      <Button
        type='button'
        size='icon'
        variant='ghost'
        className='h-7 w-7'
        onClick={() => (onToggleExpanded ?? handleToggleExpanded)(row.original.baseOrderId)}
        aria-label={isExpanded ? 'Collapse order details' : 'Expand order details'}
        aria-expanded={isExpanded}
        title={isExpanded ? 'Collapse order details' : 'Expand order details'}
      >
        {isExpanded ? <ChevronUp className='size-4' /> : <ChevronDown className='size-4' />}
      </Button>
    );
  },
  enableSorting: false,
  meta: { widthPx: 48 },
});

const buildSelectColumn = (
  isPreviewStale: boolean
): ColumnDef<BaseOrderImportPreviewItem> => ({
  id: 'select',
  header: ({ table }: { table: Table<BaseOrderImportPreviewItem> }) => (
    <Checkbox
      checked={resolveSelectAllChecked(table)}
      onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
      aria-label='Select all orders'
      disabled={isPreviewStale}
    />
  ),
  cell: ({ row }: { row: OrderPreviewRow }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
      aria-label={`Select order ${row.original.baseOrderId}`}
      disabled={isPreviewStale}
    />
  ),
  enableSorting: false,
  meta: { widthPx: 48 },
});

const BASE_ORDER_COLUMN: ColumnDef<BaseOrderImportPreviewItem> = {
  accessorKey: 'baseOrderId',
  header: 'Base Order',
  cell: ({ row }) => (
    <div className='min-w-0'>
      <div className='text-sm font-medium text-gray-100'>{row.original.baseOrderId}</div>
      <div className='text-xs text-muted-foreground truncate'>
        {renderExternalOrderNumber(row.original.orderNumber)}
      </div>
    </div>
  ),
};

const CUSTOMER_COLUMN: ColumnDef<BaseOrderImportPreviewItem> = {
  id: 'customer',
  header: 'Customer',
  cell: ({ row }) => (
    <div className='min-w-0'>
      <div className='text-sm font-medium text-gray-100 truncate'>{row.original.buyerName}</div>
      <div className='text-xs text-muted-foreground truncate'>
        {row.original.buyerEmail ?? 'No email'}
      </div>
    </div>
  ),
};

const STATUS_COLUMN: ColumnDef<BaseOrderImportPreviewItem> = {
  id: 'status',
  header: 'Status',
  cell: ({ row }) => (
    <div className='flex flex-col items-start gap-1'>
      <StatusBadge
        status={row.original.externalStatusName ?? row.original.externalStatusId ?? 'Unknown'}
        size='sm'
      />
      <Badge variant={IMPORT_STATE_VARIANTS[row.original.importState]}>
        {IMPORT_STATE_LABELS[row.original.importState]}
      </Badge>
    </div>
  ),
};

const ITEMS_COLUMN: ColumnDef<BaseOrderImportPreviewItem> = {
  id: 'items',
  header: 'Items',
  cell: ({ row }) => (
    <div className='text-sm text-gray-100'>
      {row.original.lineItems.reduce((total, item) => total + item.quantity, 0)}
    </div>
  ),
  meta: { widthPx: 72 },
};

const TOTAL_COLUMN: ColumnDef<BaseOrderImportPreviewItem> = {
  id: 'total',
  header: 'Total',
  cell: ({ row }) => (
    <div className='text-sm text-gray-100'>
      {formatOrderTotal(row.original.totalGross, row.original.currency)}
    </div>
  ),
};

const CREATED_AT_COLUMN: ColumnDef<BaseOrderImportPreviewItem> = {
  id: 'createdAt',
  header: 'Created',
  cell: ({ row }) => (
    <div className='min-w-0'>
      <div className='text-sm text-gray-100'>{formatOrderDate(row.original.orderCreatedAt)}</div>
      <div className='text-xs text-muted-foreground'>
        {renderLastImportedAt(row.original.lastImportedAt)}
      </div>
    </div>
  ),
};

export const buildColumns = (
  options: BuildColumnsOptions
): ColumnDef<BaseOrderImportPreviewItem>[] => [
  buildExpandColumn(options),
  buildSelectColumn(options.isPreviewStale),
  BASE_ORDER_COLUMN,
  CUSTOMER_COLUMN,
  STATUS_COLUMN,
  ITEMS_COLUMN,
  TOTAL_COLUMN,
  CREATED_AT_COLUMN,
];
