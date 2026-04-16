'use client';

import { ArrowUpDown } from 'lucide-react';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';

import { ActionsCell } from './columns/cells/ActionsCell';
import { ImageCell } from './columns/cells/ImageCell';
import { NameCell } from './columns/cells/NameCell';
import { PriceCell } from './columns/cells/PriceCell';
import { StockCell } from './columns/cells/StockCell';
import { IntegrationsCell } from './columns/cells/IntegrationsCell';
import { TriggerRunFeedbackHeader } from './columns/cells/TriggerRunFeedbackHeader';

import type { ColumnDef, Row, Table, Column } from '@tanstack/react-table';

const PRODUCT_TABLE_COLUMN_SIZES = {
  select: 48,
  image: 84,
  price: 140,
  stock: 88,
  createdAt: 200,
  integrations: 220,
  actions: 64,
} as const;

function resolveSelectHeader({ table }: { table: Table<ProductWithImages> }): React.JSX.Element {
  const isAll = table.getIsAllPageRowsSelected();
  const isSome = table.getIsSomePageRowsSelected();
  const checked = isAll || (isSome && 'indeterminate');
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(c): void => table.toggleAllPageRowsSelected(c === true)}
      aria-label='Select all'
      className='cursor-pointer'
    />
  );
}

function resolveSelectCell({ row }: { row: Row<ProductWithImages> }): React.JSX.Element {
  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(c): void => row.toggleSelected(c === true)}
      aria-label='Select row'
      className='cursor-pointer'
    />
  );
}

function resolveSortButton(label: string, column: Column<ProductWithImages, unknown>): React.JSX.Element {
  return (
    <Button variant='ghost' onClick={(): void => column.toggleSorting()}>
      {label}
      <ArrowUpDown className='ml-2 size-4' aria-hidden='true' />
    </Button>
  );
}

function resolvePriceHeader({ table }: { table: Table<ProductWithImages> }): React.JSX.Element {
  const meta = table.options.meta as { currencyCode?: string } | undefined;
  const currencyCode = typeof meta?.currencyCode === 'string' ? meta.currencyCode : '';
  const suffix = currencyCode !== '' ? `(${currencyCode})` : '';

  return (
    <Button variant='ghost' onClick={(): void => { /* handled by column */ }}>
      Price <span className='ml-1 text-xs text-muted-foreground' suppressHydrationWarning>{suffix}</span>
      <ArrowUpDown className='ml-2 size-4' aria-hidden='true' />
    </Button>
  );
}

function buildSelectColumn(): ColumnDef<ProductWithImages> {
  return {
    id: 'select',
    header: resolveSelectHeader,
    cell: resolveSelectCell,
    enableSorting: false,
    enableHiding: false,
    size: PRODUCT_TABLE_COLUMN_SIZES.select,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.select },
  };
}

function buildImageColumn(): ColumnDef<ProductWithImages> {
  return {
    accessorKey: 'images',
    header: 'Image',
    cell: ({ row }): React.JSX.Element => <ImageCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.image,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.image },
  };
}

function buildNameColumn(): ColumnDef<ProductWithImages> {
  return {
    accessorKey: 'name_en',
    header: ({ column }): React.JSX.Element => resolveSortButton('Name', column),
    cell: ({ row }): React.JSX.Element => <NameCell row={row} />,
  };
}

function buildPriceColumn(): ColumnDef<ProductWithImages> {
  return {
    accessorKey: 'price',
    header: resolvePriceHeader,
    cell: ({ row }): React.JSX.Element => <PriceCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.price,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.price },
  };
}

function buildStockColumn(): ColumnDef<ProductWithImages> {
  return {
    accessorKey: 'stock',
    header: ({ column }): React.JSX.Element => resolveSortButton('Stock', column),
    cell: ({ row }): React.JSX.Element => <StockCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.stock,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.stock },
  };
}

function buildCreatedAtColumn(): ColumnDef<ProductWithImages> {
  return {
    accessorKey: 'createdAt',
    header: ({ column }): React.JSX.Element => resolveSortButton('Created At', column),
    size: PRODUCT_TABLE_COLUMN_SIZES.createdAt,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.createdAt },
  };
}

function buildIntegrationsColumn(): ColumnDef<ProductWithImages> {
  return {
    id: 'integrations',
    header: () => <TriggerRunFeedbackHeader />,
    cell: ({ row }): React.JSX.Element => <IntegrationsCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.integrations,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.integrations },
  };
}

function buildActionsColumn(): ColumnDef<ProductWithImages> {
  return {
    id: 'actions',
    header: () => <span className='sr-only'>Actions</span>,
    cell: ({ row }): React.JSX.Element => <ActionsCell row={row} />,
    size: PRODUCT_TABLE_COLUMN_SIZES.actions,
    meta: { widthPx: PRODUCT_TABLE_COLUMN_SIZES.actions },
  };
}

export const getProductColumns = (): ColumnDef<ProductWithImages>[] => [
  buildSelectColumn(),
  buildImageColumn(),
  buildNameColumn(),
  buildPriceColumn(),
  buildStockColumn(),
  buildCreatedAtColumn(),
  buildIntegrationsColumn(),
  buildActionsColumn(),
];
