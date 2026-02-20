'use client';

import {
  BoxesIcon,
  BracesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DatabaseIcon,
  FileTextIcon,
  HashIcon,
  KeyIcon,
  LayersIcon,
  ListIcon,
  PlayIcon,
  RefreshCwIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TableIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Pagination,
  SectionHeader,
  FormSection,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  StandardDataTablePanel,
  StatusBadge,
  Alert,
  SearchInput,
  CollapsibleSection,
  MetadataItem,
  LoadingState,
  EmptyState,
  PageLayout,
} from '@/shared/ui';

import { CrudPanel } from '../components/CrudPanel';
import { SqlQueryConsole } from '../components/SqlQueryConsole';
import { DatabaseProvider } from '../context/DatabaseContext';
import { useDatabasePreviewState } from '../hooks/useDatabasePreviewState';

import type {
  DatabaseColumnInfo,
  DatabaseForeignKeyInfo,
  DatabaseIndexInfo,
  DatabasePreviewRow,
  DatabaseTableDetail,
  DatabaseType,
  DatabasePreviewMode,
} from '../types';
import type { ColumnDef } from '@tanstack/react-table';

const groupIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TABLE: TableIcon,
  'TABLE DATA': DatabaseIcon,
  VIEW: LayersIcon,
  'MATERIALIZED VIEW': LayersIcon,
  SEQUENCE: HashIcon,
  'SEQUENCE SET': HashIcon,
  FUNCTION: BracesIcon,
  TYPE: BoxesIcon,
  INDEX: ListIcon,
  TRIGGER: RefreshCwIcon,
  CONSTRAINT: ShieldCheckIcon,
  SCHEMA: FileTextIcon,
  EXTENSION: FileTextIcon,
};

/* ─── Table Detail Card ─── */

function TableDetailCard({
  detail,
  onQueryTable,
  onManageTable,
}: {
  detail: DatabaseTableDetail;
  onQueryTable?: (tableName: string) => void;
  onManageTable?: (tableName: string) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const { tableRows } = useDatabasePreviewState();

  const tableRow = useMemo(
    () => tableRows.find((r: DatabasePreviewRow) => r.name === detail.name),
    [tableRows, detail.name]
  );

  return (
    <CollapsibleSection
      open={expanded}
      onOpenChange={setExpanded}
      title={(
        <div className='flex flex-1 items-center gap-3'>
          <TableIcon className='size-4 text-emerald-300' />
          <span className='text-sm font-semibold text-gray-200'>{detail.name}</span>
          <span className='text-[10px] uppercase tracking-wider text-gray-500'>
            {detail.rowEstimate.toLocaleString()} rows • {detail.sizeFormatted}
          </span>
        </div>
      )}
      actions={(
        <div className='flex items-center gap-2'>
          {onQueryTable && (
            <Button
              variant='ghost'
              size='xs'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                onQueryTable(detail.name);
              }}
              className='h-7 gap-1 text-[10px] text-gray-400 hover:text-blue-300'
            >
              <PlayIcon className='size-3' />
              Query
            </Button>
          )}
          {onManageTable && (
            <Button
              variant='ghost'
              size='xs'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                onManageTable(detail.name);
              }}
              className='h-7 gap-1 text-[10px] text-gray-400 hover:text-emerald-300'
            >
              <SettingsIcon className='size-3' />
              Manage
            </Button>
          )}
        </div>
      )}
      variant='card'
      className='bg-card/60'
      headerClassName='px-4 py-3'
    >
      <div className='border-t border-border bg-black/20'>
        <Tabs defaultValue='columns' className='w-full'>
          <div className='px-4 pt-2'>
            <TabsList className='h-8 bg-transparent border-b border-white/5 w-full justify-start rounded-none'>
              <TabsTrigger value='columns' className='text-[10px] uppercase tracking-wider'>
                Columns ({detail.columns.length})
              </TabsTrigger>
              <TabsTrigger value='indexes' className='text-[10px] uppercase tracking-wider'>
                Indexes ({detail.indexes.length})
              </TabsTrigger>
              <TabsTrigger value='foreignKeys' className='text-[10px] uppercase tracking-wider'>
                Foreign Keys ({detail.foreignKeys.length})
              </TabsTrigger>
              <TabsTrigger value='data' className='text-[10px] uppercase tracking-wider'>
                Preview {tableRow ? `(${tableRow.totalRows})` : ''}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='columns' className='mt-0'>
            <ColumnsTab columns={detail.columns} />
          </TabsContent>

          <TabsContent value='indexes' className='mt-0'>
            <IndexesTab indexes={detail.indexes} />
          </TabsContent>

          <TabsContent value='foreignKeys' className='mt-0'>
            <ForeignKeysTab foreignKeys={detail.foreignKeys} />
          </TabsContent>

          <TabsContent value='data' className='mt-0'>
            <DataTab tableRows={tableRow} />
          </TabsContent>
        </Tabs>
      </div>
    </CollapsibleSection>
  );
}

function ColumnsTab({ columns }: { columns: DatabaseColumnInfo[] }): React.JSX.Element {
  const tableColumns = useMemo<ColumnDef<DatabaseColumnInfo>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Column',
      cell: ({ row }) => <span className='font-mono font-medium text-emerald-200'>{row.original.name}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <span className='font-mono text-blue-300'>{row.original.type}</span>,
    },
    {
      accessorKey: 'nullable',
      header: 'Nullable',
      cell: ({ row }) => (
        <span className={row.original.nullable ? 'text-amber-400' : 'text-gray-500'}>
          {row.original.nullable ? 'YES' : 'NO'}
        </span>
      ),
    },
    {
      accessorKey: 'defaultValue',
      header: 'Default',
      cell: ({ row }) => <span className='font-mono text-gray-400'>{row.original.defaultValue ?? '—'}</span>,
    },
    {
      id: 'key',
      header: 'Key',
      cell: ({ row }) => row.original.isPrimaryKey && (
        <StatusBadge
          status='PK'
          variant='pending'
          icon={<KeyIcon />}
          size='sm'
          className='font-bold'
        />
      ),
    },
  ], []);

  return (
    <div className='p-2'>
      <StandardDataTablePanel
        columns={tableColumns}
        data={columns}
        variant='flat'
      />
    </div>
  );
}

function IndexesTab({ indexes }: { indexes: DatabaseIndexInfo[] }): React.JSX.Element {
  const tableColumns = useMemo<ColumnDef<DatabaseIndexInfo>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Index',
      cell: ({ row }) => <span className='font-mono text-emerald-200'>{row.original.name}</span>,
    },
    {
      accessorKey: 'columns',
      header: 'Columns',
      cell: ({ row }) => <span className='font-mono text-blue-300'>{row.original.columns.join(', ')}</span>,
    },
    {
      accessorKey: 'isUnique',
      header: 'Unique',
      cell: ({ row }) => row.original.isUnique ? (
        <StatusBadge status='UNIQUE' variant='success' className='text-[9px]' />
      ) : <span className='text-gray-500'>—</span>,
    },
    {
      accessorKey: 'definition',
      header: 'Definition',
      cell: ({ row }) => (
        <div className='max-w-[300px] truncate font-mono text-gray-400 text-[10px]' title={row.original.definition}>
          {row.original.definition}
        </div>
      ),
    },
  ], []);

  return (
    <div className='p-2'>
      <StandardDataTablePanel
        columns={tableColumns}
        data={indexes}
        variant='flat'
      />
    </div>
  );
}

function ForeignKeysTab({ foreignKeys }: { foreignKeys: DatabaseForeignKeyInfo[] }): React.JSX.Element {
  const tableColumns = useMemo<ColumnDef<DatabaseForeignKeyInfo>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Constraint',
      cell: ({ row }) => <span className='font-mono text-emerald-200'>{row.original.name}</span>,
    },
    {
      accessorKey: 'column',
      header: 'Column',
      cell: ({ row }) => <span className='font-mono text-blue-300'>{row.original.column}</span>,
    },
    {
      id: 'references',
      header: 'References',
      cell: ({ row }) => (
        <div className='font-mono text-gray-200'>
          <span className='text-emerald-300'>{row.original.referencedTable}</span>
          <span className='text-gray-500'>.</span>
          <span className='text-blue-300'>{row.original.referencedColumn}</span>
        </div>
      ),
    },
    {
      accessorKey: 'onDelete',
      header: 'On Delete',
      cell: ({ row }) => <span className='text-gray-400'>{row.original.onDelete}</span>,
    },
  ], []);

  return (
    <div className='p-2'>
      <StandardDataTablePanel
        columns={tableColumns}
        data={foreignKeys}
        variant='flat'
      />
    </div>
  );
}

function DataTab({
  tableRows,
}: {
  tableRows: DatabasePreviewRow | undefined;
}): React.JSX.Element {
  const { page, pageSize } = useDatabasePreviewState();
  
  const columns = useMemo(() => {
    if (!tableRows || tableRows.rows.length === 0) return [];
    return Object.keys(tableRows.rows[0] ?? {}).map(col => ({
      accessorKey: col,
      header: col,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
        <span className='max-w-[200px] truncate font-mono block' title={formatCellValue(row.original[col])}>
          {formatCellValue(row.original[col])}
        </span>
      )
    } as ColumnDef<Record<string, unknown>>));
  }, [tableRows]);

  if (!tableRows || tableRows.rows.length === 0) {
    return (
      <EmptyState
        title='No row data available'
        description='This table appears to be empty.'
        variant='compact'
        className='py-8'
      />
    );
  }

  const startRow = (page - 1) * pageSize + 1;

  return (
    <div className='p-2 space-y-2'>
      <div className='px-2 text-[10px] uppercase font-bold text-gray-500'>
        Rows {startRow}–{startRow + tableRows.rows.length - 1} of {tableRows.totalRows.toLocaleString()}
      </div>
      <StandardDataTablePanel
        columns={columns}
        data={tableRows.rows}
        variant='flat'
      />
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/* ─── Main Page Content ─── */

function DatabasePreviewContent(): React.JSX.Element {
  const {
    dbType,
    tableDetails,
    filteredTableDetails,
    groups,
    filteredGroups,
    tables,
    enums,
    databaseSize,
    isLoading,
    error,
    mode,
    backupName,
    page,
    setPage,
    pageSize,
    setPageSize,
    maxPage,
    groupQuery,
    setGroupQuery,
    tableQuery,
    setTableQuery,
    expandedGroups,
    toggleGroup,
    consoleSql,
    showConsole,
    setShowConsole,
    crudTable,
    showCrud,
    setShowCrud,
    consoleSectionRef,
    crudSectionRef,
    handleQueryTable,
    handleManageTable,
    stats,
  } = useDatabasePreviewState();
  return (
    <PageLayout
      title='Database Preview'
      description={
        mode === 'current'
          ? 'Source: Current database instance'
          : backupName
            ? `Source: ${backupName}`
            : 'No source selected.'
      }
      eyebrow={(
        <Link href='/admin/databases' className='text-blue-300 hover:text-blue-200 transition-colors'>
          ← Back to databases
        </Link>
      )}
      refresh={{
        onRefresh: () => window.location.reload(),
        isRefreshing: false,
      }}
    >
      {error && (
        <Alert variant='error' className='flex items-center gap-3 mb-6'>
          <ShieldCheckIcon className='size-4 shrink-0' />
          {error}
        </Alert>
      )}

      {isLoading ? (
        <LoadingState message='Reconstructing database schema preview...' className='py-20' />
      ) : (
        <div className='space-y-6'>
          {/* ── Database Metrics ── */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
            {databaseSize && (
              <MetadataItem
                label='Total Size'
                value={databaseSize}
                variant='card'
                valueClassName='text-lg font-semibold text-white mt-1'
                className='p-4'
              />
            )}
            <MetadataItem
              label='Tables'
              value={tables.length}
              variant='card'
              valueClassName='text-lg font-semibold text-white mt-1'
              className='p-4'
            />
            <MetadataItem
              label='Enums'
              value={enums.length}
              variant='card'
              valueClassName='text-lg font-semibold text-white mt-1'
              className='p-4'
            />
            <MetadataItem
              label='Indexes'
              value={stats.totalIndexes}
              variant='card'
              valueClassName='text-lg font-semibold text-white mt-1'
              className='p-4'
            />
            <MetadataItem
              label='Relations'
              value={stats.totalFks}
              variant='card'
              valueClassName='text-lg font-semibold text-white mt-1'
              className='p-4'
            />
          </div>

          {/* ── Tables Section ── */}
          {tableDetails.length > 0 && (
            <FormSection
              title='Table Browser'
              description={`${filteredTableDetails.length} items`}
              actions={
                <div className='flex items-center gap-4'>
                  <SearchInput
                    size='sm'
                    value={tableQuery}
                    onChange={(e) => setTableQuery(e.target.value)}
                    onClear={() => setTableQuery('')}
                    placeholder='Filter tables...'
                    className='h-8 w-48'
                  />
                  <div className='flex items-center gap-2'>
                    <Pagination
                      page={page}
                      totalPages={maxPage}
                      onPageChange={setPage}
                      pageSize={pageSize}
                      onPageSizeChange={(s) => {
                        setPage(1);
                        setPageSize(s);
                      }}
                      pageSizeOptions={[10, 20, 50, 100]}
                      showPageSize
                      variant='compact'
                    />
                  </div>
                </div>
              }
              className='p-6'
            >
              <div className='grid gap-3 mt-4'>
                {filteredTableDetails.map((detail) => (
                  <TableDetailCard
                    key={detail.name}
                    detail={detail}
                    onQueryTable={handleQueryTable}
                    onManageTable={handleManageTable}
                  />
                ))}
              </div>
            </FormSection>
          )}

          {/* ── Schema Groups ── */}
          {groups.length > 0 && (
            <FormSection
              title='Additional Objects'
              description='Functions, views, and sequences'
              actions={
                <SearchInput
                  size='sm'
                  value={groupQuery}
                  onChange={(e) => setGroupQuery(e.target.value)}
                  onClear={() => setGroupQuery('')}
                  placeholder='Search objects...'
                  className='h-8 w-40'
                />
              }
              className='p-6'
            >
              <div className='grid gap-2 mt-4'>
                {filteredGroups.map((group) => {
                  const isExpanded = expandedGroups[group.type] ?? false;
                  const Icon = groupIconMap[group.type] ?? FileTextIcon;
                  return (
                    <div key={group.type} className='rounded-md border border-border/60 bg-card/40'>
                      <button
                        type='button'
                        onClick={() => toggleGroup(group.type)}
                        className='flex w-full items-center justify-between p-3 text-left'
                      >
                        <span className='flex items-center gap-2 text-xs font-semibold text-gray-200'>
                          <Icon className='size-4 text-sky-300' />
                          {group.type}
                          <Badge variant='outline' className='text-[9px] bg-sky-500/5'>{group.objects.length}</Badge>
                        </span>
                        {isExpanded ? <ChevronDownIcon className='size-4 text-gray-500' /> : <ChevronRightIcon className='size-4 text-gray-500' />}
                      </button>
                      {isExpanded && (
                        <div className='border-t border-border/40 p-3 bg-black/20'>
                          <div className='flex flex-wrap gap-2'>
                            {group.objects.map(obj => (
                              <span key={obj} className='font-mono text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded'>
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </FormSection>
          )}

          {/* ── SQL Console ── */}
          {dbType === 'postgresql' && (
            <div ref={consoleSectionRef} className='scroll-mt-6'>
              <CollapsibleSection
                title='SQL Query Console'
                open={showConsole}
                onOpenChange={setShowConsole}
                className='p-6'
              >
                <SqlQueryConsole
                  defaultDbType='postgresql'
                  initialSql={consoleSql}
                />
              </CollapsibleSection>
            </div>
          )}

          {/* ── Table Manager ── */}
          {showCrud && tableDetails.length > 0 && (
            <div ref={crudSectionRef} className='scroll-mt-6'>
              <FormSection
                title='Row Management'
                actions={
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={() => setShowCrud(false)}
                  >
                    Exit Manager
                  </Button>
                }
                className='p-6 border-emerald-500/20'
              >
                <div className='mt-4'>
                  <CrudPanel
                    tableDetails={tableDetails}
                    defaultTable={crudTable}
                    dbType={dbType}
                  />
                </div>
              </FormSection>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function DatabasePreviewPageInner(): React.JSX.Element {
  const searchParams = useSearchParams();
  const backupName = searchParams.get('backup') ?? '';
  const mode = searchParams.get('mode') ?? 'backup';
  const previewType = searchParams.get('type') ?? 'postgresql';
  const previewMode: DatabasePreviewMode =
    mode === 'current' ? 'current' : 'backup';

  return (
    <DatabaseProvider
      defaultDbType={previewType as DatabaseType}
      mode={previewMode}
      backupName={backupName || undefined}
    >
      <DatabasePreviewContent />
    </DatabaseProvider>
  );
}

export default function DatabasePreviewPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Mounting database preview environment...' className='py-12' />}>
      <DatabasePreviewPageInner />
    </Suspense>
  );
}
