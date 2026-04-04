'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { ColumnDef, Row, Table } from '@tanstack/react-table';
import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products';
import {
  formatOrderDate,
  formatOrderTotal,
  IMPORT_STATE_LABELS,
  IMPORT_STATE_VARIANTS,
} from './AdminProductOrdersImportPage.utils';

interface BuildColumnsOptions {
  expanded: Record<string, boolean>;
  handleToggleExpanded: (orderId: string) => void;
  onToggleExpanded?: (orderId: string) => void;
  isPreviewStale: boolean;
}

export const buildColumns = ({
  expanded,
  handleToggleExpanded,
  onToggleExpanded,
  isPreviewStale,
}: BuildColumnsOptions): ColumnDef<BaseOrderImportPreviewItem>[] => [
  {
    id: 'expand',
    header: () => null,
    cell: ({ row }: { row: Row<BaseOrderImportPreviewItem> }) => {
      const isExpanded = Boolean(expanded[row.original.baseOrderId]);
      return (
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='h-7 w-7'
          onClick={() =>
            (onToggleExpanded ?? handleToggleExpanded)(row.original.baseOrderId)
          }
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
  },
  {
    id: 'select',
    header: ({ table }: { table: Table<BaseOrderImportPreviewItem> }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
        aria-label='Select all orders'
        disabled={isPreviewStale}
      />
    ),
    cell: ({ row }: { row: Row<BaseOrderImportPreviewItem> }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
        aria-label={`Select order ${row.original.baseOrderId}`}
        disabled={isPreviewStale}
      />
    ),
    enableSorting: false,
    meta: { widthPx: 48 },
  },
  {
    accessorKey: 'baseOrderId',
    header: 'Base Order',
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='text-sm font-medium text-gray-100'>{row.original.baseOrderId}</div>
        <div className='text-xs text-muted-foreground truncate'>
          {row.original.orderNumber
            ? `Order no. ${row.original.orderNumber}`
            : 'No external order number'}
        </div>
      </div>
    ),
  },
  {
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
  },
  {
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
  },
  {
    id: 'items',
    header: 'Items',
    cell: ({ row }) => (
      <div className='text-sm text-gray-100'>
        {row.original.lineItems.reduce((total, item) => total + item.quantity, 0)}
      </div>
    ),
    meta: { widthPx: 72 },
  },
  {
    id: 'total',
    header: 'Total',
    cell: ({ row }) => (
      <div className='text-sm text-gray-100'>
        {formatOrderTotal(row.original.totalGross, row.original.currency)}
      </div>
    ),
  },
  {
    id: 'createdAt',
    header: 'Created',
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='text-sm text-gray-100'>{formatOrderDate(row.original.orderCreatedAt)}</div>
        <div className='text-xs text-muted-foreground'>
          {row.original.lastImportedAt
            ? `Last import ${formatOrderDate(row.original.lastImportedAt)}`
            : 'Not imported yet'}
        </div>
      </div>
    ),
  },
];
