import { useState, useMemo } from 'react';
import { TableIcon, SettingsIcon, PlayIcon, KeyIcon } from 'lucide-react';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger, CollapsibleSection, Hint } from '@/shared/ui/primitives.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { formatDatabaseCellValue } from '../format-cell-value';
import { useDatabasePreviewState } from '../../hooks/useDatabasePreviewState';
import type { DatabaseTableDetail, DatabaseTablePreviewData, DatabaseColumnInfo, DatabaseIndexInfo, DatabaseForeignKeyInfo } from '@/shared/contracts/database';
import type { ColumnDef } from '@tanstack/react-table';

export const TableDetailCard = ({
  detail,
  onQueryTable,
  onManageTable,
}: {
  detail: DatabaseTableDetail;
  onQueryTable?: (tableName: string) => void;
  onManageTable?: (tableName: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { tableRows } = useDatabasePreviewState();
  const tableRow = useMemo(() => tableRows.find((r) => r.name === detail.name), [tableRows, detail.name]);

  return (
    <CollapsibleSection
      open={expanded}
      onOpenChange={setExpanded}
      title={
        <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} flex-1`}>
          <TableIcon className='size-4 text-emerald-300' />
          <span className='text-sm font-semibold text-gray-200'>{detail.name}</span>
          <Hint size='xxs' uppercase className='text-gray-500'>
            {detail.rowEstimate.toLocaleString()} rows • {detail.sizeFormatted}
          </Hint>
        </div>
      }
      actions={
        <div className='flex items-center gap-2'>
          {onQueryTable && (
            <Button variant='ghost' size='xs' onClick={(e) => { e.stopPropagation(); onQueryTable(detail.name); }} className='h-7 gap-1 text-[10px] text-gray-400 hover:text-blue-300'>
              <PlayIcon className='size-3' /> Query
            </Button>
          )}
          {onManageTable && (
            <Button variant='ghost' size='xs' onClick={(e) => { e.stopPropagation(); onManageTable(detail.name); }} className='h-7 gap-1 text-[10px] text-gray-400 hover:text-emerald-300'>
              <SettingsIcon className='size-3' /> Manage
            </Button>
          )}
        </div>
      }
      variant='card'
      className='bg-card/60'
      headerClassName='px-4 py-3'
    >
      <div className='border-t border-border bg-black/20'>
        <Tabs defaultValue='columns' className='w-full'>
          <TabsList className='h-8 bg-transparent border-b border-white/5 w-full justify-start rounded-none'>
            <TabsTrigger value='columns' className='text-[10px] uppercase tracking-wider'>Columns</TabsTrigger>
            <TabsTrigger value='indexes' className='text-[10px] uppercase tracking-wider'>Indexes</TabsTrigger>
            <TabsTrigger value='foreignKeys' className='text-[10px] uppercase tracking-wider'>Foreign Keys</TabsTrigger>
            <TabsTrigger value='data' className='text-[10px] uppercase tracking-wider'>Preview</TabsTrigger>
          </TabsList>
          <TabsContent value='columns'><ColumnsTab detail={detail} /></TabsContent>
          <TabsContent value='indexes'><IndexesTab detail={detail} /></TabsContent>
          <TabsContent value='foreignKeys'><ForeignKeysTab detail={detail} /></TabsContent>
          <TabsContent value='data'><DataTab tableRow={tableRow} /></TabsContent>
        </Tabs>
      </div>
    </CollapsibleSection>
  );
};

const ColumnsTab = ({ detail }: { detail: DatabaseTableDetail }) => {
  const cols: ColumnDef<DatabaseColumnInfo>[] = [
    { accessorKey: 'name', header: 'Column', cell: ({ row }) => <span className='font-mono text-emerald-200'>{row.original.name}</span> },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className='font-mono text-blue-300'>{row.original.type}</span> },
    { accessorKey: 'nullable', header: 'Nullable', cell: ({ row }) => <span className={row.original.nullable ? 'text-amber-400' : 'text-gray-500'}>{row.original.nullable ? 'YES' : 'NO'}</span> },
    { accessorKey: 'defaultValue', header: 'Default', cell: ({ row }) => <span className='font-mono text-gray-400'>{row.original.defaultValue ?? '—'}</span> },
    { id: 'key', header: 'Key', cell: ({ row }) => row.original.isPrimaryKey && <StatusBadge status='PK' variant='pending' icon={<KeyIcon />} size='sm' /> },
  ];
  return <div className='p-2'><StandardDataTablePanel columns={cols} data={detail.columns} variant='flat' /></div>;
};

const IndexesTab = ({ detail }: { detail: DatabaseTableDetail }) => {
  const cols: ColumnDef<DatabaseIndexInfo>[] = [
    { accessorKey: 'name', header: 'Index', cell: ({ row }) => <span className='font-mono text-emerald-200'>{row.original.name}</span> },
    { accessorKey: 'columns', header: 'Columns', cell: ({ row }) => <span className='font-mono text-blue-300'>{row.original.columns.join(', ')}</span> },
    { accessorKey: 'isUnique', header: 'Unique', cell: ({ row }) => row.original.isUnique ? <StatusBadge status='UNIQUE' variant='success' className='text-[9px]' /> : <span className='text-gray-500'>—</span> },
  ];
  return <div className='p-2'><StandardDataTablePanel columns={cols} data={detail.indexes} variant='flat' /></div>;
};

const ForeignKeysTab = ({ detail }: { detail: DatabaseTableDetail }) => {
  const cols: ColumnDef<DatabaseForeignKeyInfo>[] = [
    { accessorKey: 'name', header: 'Constraint', cell: ({ row }) => <span className='font-mono text-emerald-200'>{row.original.name}</span> },
    { accessorKey: 'referencedTable', header: 'References', cell: ({ row }) => <span className='font-mono'><span className='text-emerald-300'>{row.original.referencedTable}</span>.<span className='text-blue-300'>{row.original.referencedColumn}</span></span> },
  ];
  return <div className='p-2'><StandardDataTablePanel columns={cols} data={detail.foreignKeys} variant='flat' /></div>;
};

const DataTab = ({ tableRow }: { tableRow?: DatabaseTablePreviewData }) => {
  const columns = useMemo(() => {
    if (!tableRow?.rows[0]) return [];
    return Object.keys(tableRow.rows[0]).map((col) => ({
      accessorKey: col,
      header: col,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => <span className='font-mono' title={formatDatabaseCellValue(row.original[col])}>{formatDatabaseCellValue(row.original[col])}</span>,
    }));
  }, [tableRow]);

  if (!tableRow?.rows.length) return <div className='p-8 text-center text-gray-500 text-sm'>No data available</div>;
  return <div className='p-2'><StandardDataTablePanel columns={columns} data={tableRow.rows} variant='flat' maxHeight='40vh' enableVirtualization /></div>;
};
