'use client';

import {
  ChevronDownIcon,
  ChevronRightIcon,
  Columns3Icon,
  DatabaseIcon,
  HardDriveIcon,
  KeyRoundIcon,
  SearchIcon,
  Table2Icon,
} from 'lucide-react';
import type { JSX } from 'react';

import type { DatabaseTableDetail } from '@/shared/contracts/database';
import { cn } from '@/shared/utils/ui-utils';

export const formatRows = (rows: number): string =>
  `${rows.toLocaleString()} ${rows === 1 ? 'row' : 'rows'}`;

export const getSizeLabel = (sizeFormatted: string | undefined): string => {
  const trimmed = sizeFormatted?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : 'n/a';
};

export const matchesQuery = (value: string, query: string): boolean =>
  value.toLowerCase().includes(query);

const getIndexLabel = (index: DatabaseTableDetail['indexes'][number]): string => {
  if (index.isUnique) return 'unique';
  const columns = index.columns.join(', ');
  return columns !== '' ? columns : 'index';
};

export function DatabaseTreeHeader({
  databaseLabel,
  isFetching,
}: {
  databaseLabel: string;
  isFetching: boolean;
}): JSX.Element {
  return (
    <div className='flex items-start justify-between gap-3'>
      <div className='min-w-0 space-y-1'>
        <h3 className='flex items-center gap-2 text-sm font-semibold text-white'>
          <DatabaseIcon className='size-4 shrink-0 text-emerald-200' />
          Database Tree
        </h3>
        <p className='truncate text-xs text-gray-400' title={databaseLabel}>
          {databaseLabel}
        </p>
      </div>
      {isFetching ? (
        <span className='shrink-0 rounded border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100'>
          Refreshing
        </span>
      ) : null}
    </div>
  );
}

export function DatabaseTreeRootItem({
  databaseLabel,
  totalRows,
}: {
  databaseLabel: string;
  totalRows: number;
}): JSX.Element {
  return (
    <div
      role='treeitem'
      aria-expanded='true'
      className='flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-200'
    >
      <HardDriveIcon className='size-3.5 shrink-0 text-gray-400' />
      <span className='min-w-0 flex-1 truncate' title={databaseLabel}>
        {databaseLabel}
      </span>
      <span className='shrink-0 font-mono text-[11px] text-gray-400'>
        {formatRows(totalRows)}
      </span>
    </div>
  );
}

export function DatabaseTreeFieldItem({
  tableName,
  column,
}: {
  tableName: string;
  column: DatabaseTableDetail['columns'][number];
}): JSX.Element {
  return (
    <div
      role='treeitem'
      aria-label={`${tableName}.${column.name} field`}
      className='grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-[11px] text-gray-400'
    >
      <span className='min-w-0 truncate font-mono' title={column.name}>
        {column.name}
      </span>
      <span className='shrink-0 truncate text-gray-500' title={column.type}>
        {column.type}
      </span>
    </div>
  );
}

export function DatabaseTreeIndexItem({
  tableName,
  index,
}: {
  tableName: string;
  index: DatabaseTableDetail['indexes'][number];
}): JSX.Element {
  return (
    <div
      role='treeitem'
      aria-label={`${tableName}.${index.name} index`}
      className='grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-[11px] text-gray-400'
    >
      <span className='min-w-0 truncate font-mono' title={index.name}>
        {index.name}
      </span>
      <span
        className='shrink-0 truncate text-gray-500'
        title={index.definition ?? index.columns.join(', ')}
      >
        {getIndexLabel(index)}
      </span>
    </div>
  );
}

function TableItemContent({ table }: { table: DatabaseTableDetail }): JSX.Element {
  return (
    <div role='group' className='space-y-2 border-t border-white/10 px-3 py-2'>
      <div className='flex items-center gap-2 text-[11px] font-medium uppercase text-gray-500'>
        <Columns3Icon className='size-3.5' />
        Fields
        <span className='ml-auto font-mono'>{table.columns.length.toLocaleString()}</span>
      </div>
      {table.columns.length === 0 ? (
        <p className='pl-5 text-[11px] text-gray-500'>No sampled fields.</p>
      ) : (
        <div className='space-y-1 pl-5'>
          {table.columns.map((column) => (
            <DatabaseTreeFieldItem key={column.name} tableName={table.name} column={column} />
          ))}
        </div>
      )}

      {table.indexes.length > 0 ? (
        <>
          <div className='flex items-center gap-2 text-[11px] font-medium uppercase text-gray-500'>
            <KeyRoundIcon className='size-3.5' />
            Indexes
            <span className='ml-auto font-mono'>{table.indexes.length.toLocaleString()}</span>
          </div>
          <div className='space-y-1 pl-5'>
            {table.indexes.map((index) => (
              <DatabaseTreeIndexItem key={index.name} tableName={table.name} index={index} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export interface DatabaseTreeTableItemProps {
  table: DatabaseTableDetail;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: (tableName: string) => void;
  onSelect: (tableName: string) => void;
}

export function DatabaseTreeTableItem({
  table,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
}: DatabaseTreeTableItemProps): JSX.Element {
  const sizeLabel = getSizeLabel(table.sizeFormatted);

  return (
    <div
      role='treeitem'
      aria-expanded={isExpanded}
      aria-selected={isSelected}
      className={cn(
        'rounded-md border text-xs transition-colors',
        isSelected
          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50'
          : 'border-transparent text-gray-300 hover:border-white/10 hover:bg-white/5'
      )}
    >
      <div className='grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2'>
        <button
          type='button'
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${table.name} collection`}
          className='rounded p-0.5 text-gray-500 hover:bg-white/10 hover:text-gray-200'
          onClick={(event) => {
            event.stopPropagation();
            onToggle(table.name);
          }}
        >
          {isExpanded ? <ChevronDownIcon className='size-3.5' /> : <ChevronRightIcon className='size-3.5' />}
        </button>
        <button
          type='button'
          aria-label={`Select ${table.name} collection`}
          onClick={() => onSelect(table.name)}
          className='flex min-w-0 items-center gap-2 text-left'
        >
          <Table2Icon
            className={cn('size-3.5 shrink-0', isSelected ? 'text-emerald-200' : 'text-gray-500')}
          />
          <span className='min-w-0 truncate font-mono' title={table.name}>
            {table.name}
          </span>
        </button>
        <span className='flex shrink-0 items-center gap-2 text-[11px] text-gray-400'>
          <span>{formatRows(table.rowEstimate)}</span>
          <span>{sizeLabel}</span>
        </span>
      </div>

      {isExpanded ? <TableItemContent table={table} /> : null}
    </div>
  );
}

export function DatabaseTreeStats({
  collectionCount,
  databaseSizeLabel,
  filteredCount,
  isFiltered,
}: {
  collectionCount: number;
  databaseSizeLabel: string;
  filteredCount: number;
  isFiltered: boolean;
}): JSX.Element {
  return (
    <div className='mt-3 grid grid-cols-2 gap-2 text-xs'>
      <div className='rounded-md border border-white/10 bg-black/20 px-3 py-2'>
        <p className='text-[11px] uppercase text-gray-500'>Collections</p>
        <p className='mt-1 font-semibold text-gray-100'>
          {isFiltered
            ? `${filteredCount.toLocaleString()} / ${collectionCount.toLocaleString()}`
            : collectionCount.toLocaleString()}
        </p>
      </div>
      <div className='rounded-md border border-white/10 bg-black/20 px-3 py-2'>
        <p className='text-[11px] uppercase text-gray-500'>Database Size</p>
        <p className='mt-1 font-semibold text-gray-100'>{databaseSizeLabel}</p>
      </div>
    </div>
  );
}

export function DatabaseTreeFilters({
  filter,
  onFilterChange,
  onExpand,
  onCollapse,
}: {
  filter: string;
  onFilterChange: (value: string) => void;
  onExpand: () => void;
  onCollapse: () => void;
}): JSX.Element {
  return (
    <div className='mt-3 flex items-center gap-2'>
      <div className='relative min-w-0 flex-1'>
        <SearchIcon className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-500' />
        <input
          type='search'
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder='Filter tree...'
          aria-label='Filter database tree'
          className='h-8 w-full rounded-md border border-white/10 bg-black/20 pl-8 pr-2 text-xs text-gray-200 outline-none transition-colors placeholder:text-gray-500 focus:border-emerald-400/40'
        />
      </div>
      <button
        type='button'
        aria-label='Expand visible collections'
        title='Expand visible collections'
        onClick={onExpand}
        className='flex size-8 items-center justify-center rounded-md border border-white/10 bg-black/20 text-gray-400 hover:bg-white/10 hover:text-gray-100'
      >
        <ChevronDownIcon className='size-3.5' />
      </button>
      <button
        type='button'
        aria-label='Collapse visible collections'
        title='Collapse visible collections'
        onClick={onCollapse}
        className='flex size-8 items-center justify-center rounded-md border border-white/10 bg-black/20 text-gray-400 hover:bg-white/10 hover:text-gray-100'
      >
        <ChevronRightIcon className='size-3.5' />
      </button>
    </div>
  );
}
