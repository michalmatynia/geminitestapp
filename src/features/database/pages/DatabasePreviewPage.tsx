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
  TerminalIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Input,
  Pagination,
  SectionHeader,
  SectionPanel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

import { CrudPanel } from '../components/CrudPanel';
import { SqlQueryConsole } from '../components/SqlQueryConsole';
import { DatabaseProvider, useDatabase } from '../context/DatabaseContext';

import type {
  DatabaseColumnInfo,
  DatabaseEnumInfo,
  DatabaseForeignKeyInfo,
  DatabaseIndexInfo,
  DatabasePreviewGroup,
  DatabasePreviewMode,
  DatabasePreviewRow,
  DatabasePreviewTable,
  DatabaseTableDetail,
  DatabaseType,
} from '../types';

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
  page,
  pageSize,
  onQueryTable,
  onManageTable,
}: {
  detail: DatabaseTableDetail;
  page: number;
  pageSize: number;
  onQueryTable?: (tableName: string) => void;
  onManageTable?: (tableName: string) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const { tableRows } = useDatabase();

  const tableRow = useMemo(
    () => tableRows.find((r: DatabasePreviewRow) => r.name === detail.name),
    [tableRows, detail.name]
  );

  return (
    <div className='rounded-md border border-border bg-card/60'>
      <div className='flex items-center justify-between px-4 py-3'>
        <button
          type='button'
          onClick={(): void => setExpanded((prev: boolean) => !prev)}
          className='flex flex-1 items-center gap-3 text-left'
        >
          <TableIcon className='size-4 text-emerald-300' />
          <span className='text-sm font-semibold text-gray-200'>{detail.name}</span>
          <span className='text-xs text-gray-500'>
            ~{detail.rowEstimate.toLocaleString()} rows
          </span>
          <span className='text-xs text-gray-500'>{detail.sizeFormatted}</span>
        </button>
        <div className='flex items-center gap-2'>
          {onQueryTable && (
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                onQueryTable(detail.name);
              }}
              className='h-6 gap-1 text-[10px] text-gray-400 hover:text-blue-300'
              title={`SELECT * FROM "${detail.name}" LIMIT 20`}
            >
              <PlayIcon className='size-3' />
              Query
            </Button>
          )}
          {onManageTable && (
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                onManageTable(detail.name);
              }}
              className='h-6 gap-1 text-[10px] text-gray-400 hover:text-emerald-300'
              title='Manage rows'
            >
              <SettingsIcon className='size-3' />
              Manage
            </Button>
          )}
          {detail.foreignKeys.length > 0 && (
            <Badge variant='outline' className='text-[10px]'>
              {detail.foreignKeys.length} FK{detail.foreignKeys.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant='outline' className='text-[10px]'>
            {detail.columns.length} cols
          </Badge>
          {expanded ? (
            <ChevronDownIcon className='size-4 text-gray-400' />
          ) : (
            <ChevronRightIcon className='size-4 text-gray-400' />
          )}
        </div>
      </div>

      {expanded && (
        <div className='border-t border-border'>
          <Tabs defaultValue='columns' className='w-full'>
            <TabsList className='border-b border-border bg-transparent px-4'>
              <TabsTrigger value='columns' className='text-xs'>
                Columns ({detail.columns.length})
              </TabsTrigger>
              <TabsTrigger value='indexes' className='text-xs'>
                Indexes ({detail.indexes.length})
              </TabsTrigger>
              <TabsTrigger value='foreignKeys' className='text-xs'>
                Foreign Keys ({detail.foreignKeys.length})
              </TabsTrigger>
              <TabsTrigger value='data' className='text-xs'>
                Data {tableRow ? `(${tableRow.totalRows})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value='columns' className='p-0'>
              <ColumnsTab columns={detail.columns} />
            </TabsContent>

            <TabsContent value='indexes' className='p-0'>
              <IndexesTab indexes={detail.indexes} />
            </TabsContent>

            <TabsContent value='foreignKeys' className='p-0'>
              <ForeignKeysTab foreignKeys={detail.foreignKeys} />
            </TabsContent>

            <TabsContent value='data' className='p-0'>
              <DataTab tableRows={tableRow} page={page} pageSize={pageSize} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function ColumnsTab({ columns }: { columns: DatabaseColumnInfo[] }): React.JSX.Element {
  if (columns.length === 0) {
    return <p className='px-4 py-3 text-xs text-gray-500'>No columns found.</p>;
  }
  return (
    <div className='overflow-auto'>
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b border-border text-left text-gray-500'>
            <th className='px-4 py-2 font-medium'>Column</th>
            <th className='px-4 py-2 font-medium'>Type</th>
            <th className='px-4 py-2 font-medium'>Nullable</th>
            <th className='px-4 py-2 font-medium'>Default</th>
            <th className='px-4 py-2 font-medium'>Key</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {columns.map((col: DatabaseColumnInfo) => (
            <tr key={col.name} className='text-gray-300'>
              <td className='px-4 py-2 font-mono'>{col.name}</td>
              <td className='px-4 py-2 font-mono text-blue-300'>{col.type}</td>
              <td className='px-4 py-2'>
                {col.nullable ? (
                  <span className='text-yellow-400'>YES</span>
                ) : (
                  <span className='text-gray-500'>NO</span>
                )}
              </td>
              <td className='px-4 py-2 font-mono text-gray-400'>
                {col.defaultValue ?? <span className='text-gray-600'>—</span>}
              </td>
              <td className='px-4 py-2'>
                {col.isPrimaryKey && (
                  <Badge variant='default' className='gap-1 text-[10px]'>
                    <KeyIcon className='size-3' />
                    PK
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndexesTab({ indexes }: { indexes: DatabaseIndexInfo[] }): React.JSX.Element {
  if (indexes.length === 0) {
    return <p className='px-4 py-3 text-xs text-gray-500'>No indexes found.</p>;
  }
  return (
    <div className='overflow-auto'>
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b border-border text-left text-gray-500'>
            <th className='px-4 py-2 font-medium'>Index</th>
            <th className='px-4 py-2 font-medium'>Columns</th>
            <th className='px-4 py-2 font-medium'>Unique</th>
            <th className='px-4 py-2 font-medium'>Definition</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {indexes.map((idx: DatabaseIndexInfo) => (
            <tr key={idx.name} className='text-gray-300'>
              <td className='px-4 py-2 font-mono'>{idx.name}</td>
              <td className='px-4 py-2 font-mono text-blue-300'>
                {idx.columns.join(', ')}
              </td>
              <td className='px-4 py-2'>
                {idx.isUnique ? (
                  <Badge variant='outline' className='text-[10px] text-emerald-400'>UNIQUE</Badge>
                ) : (
                  <span className='text-gray-500'>—</span>
                )}
              </td>
              <td className='max-w-xs truncate px-4 py-2 font-mono text-gray-400' title={idx.definition}>
                {idx.definition}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ForeignKeysTab({ foreignKeys }: { foreignKeys: DatabaseForeignKeyInfo[] }): React.JSX.Element {
  if (foreignKeys.length === 0) {
    return <p className='px-4 py-3 text-xs text-gray-500'>No foreign keys found.</p>;
  }
  return (
    <div className='overflow-auto'>
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b border-border text-left text-gray-500'>
            <th className='px-4 py-2 font-medium'>Constraint</th>
            <th className='px-4 py-2 font-medium'>Column</th>
            <th className='px-4 py-2 font-medium'>References</th>
            <th className='px-4 py-2 font-medium'>On Delete</th>
            <th className='px-4 py-2 font-medium'>On Update</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {foreignKeys.map((fk: DatabaseForeignKeyInfo) => (
            <tr key={fk.name} className='text-gray-300'>
              <td className='px-4 py-2 font-mono'>{fk.name}</td>
              <td className='px-4 py-2 font-mono text-blue-300'>{fk.column}</td>
              <td className='px-4 py-2 font-mono'>
                <span className='text-emerald-300'>{fk.referencedTable}</span>
                <span className='text-gray-500'>.</span>
                <span className='text-blue-300'>{fk.referencedColumn}</span>
              </td>
              <td className='px-4 py-2 text-gray-400'>{fk.onDelete}</td>
              <td className='px-4 py-2 text-gray-400'>{fk.onUpdate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTab({
  tableRows,
  page,
  pageSize,
}: {
  tableRows: DatabasePreviewRow | undefined;
  page: number;
  pageSize: number;
}): React.JSX.Element {
  if (!tableRows || tableRows.rows.length === 0) {
    return <p className='px-4 py-3 text-xs text-gray-500'>No row data available.</p>;
  }
  const columns = Object.keys(tableRows.rows[0] ?? {});
  const startRow = (page - 1) * pageSize + 1;
  return (
    <div className='overflow-auto'>
      <p className='px-4 py-2 text-[11px] text-gray-500'>
        Showing rows {startRow}–{startRow + tableRows.rows.length - 1} of {tableRows.totalRows.toLocaleString()}
      </p>
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b border-border text-left text-gray-500'>
            {columns.map((col: string) => (
              <th key={col} className='whitespace-nowrap px-3 py-2 font-medium font-mono'>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {tableRows.rows.map((row: Record<string, unknown>, i: number) => (
            <tr key={i} className='text-gray-300'>
              {columns.map((col: string) => (
                <td key={col} className='max-w-[200px] truncate whitespace-nowrap px-3 py-1.5 font-mono'>
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
    groups,
    tables,
    tableRows,
    enums,
    databaseSize,
    isLoading: loading,
    error,
    mode,
    backupName,
  } = useDatabase();

  const [groupQuery, setGroupQuery] = useState('');
  const [tableQuery, setTableQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [consoleSql, setConsoleSql] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const [crudTable, setCrudTable] = useState('');
  const [showCrud, setShowCrud] = useState(false);
  const consoleSectionRef = useRef<HTMLDivElement>(null);
  const crudSectionRef = useRef<HTMLDivElement>(null);

  const scrollToConsole = useCallback(() => {
    setTimeout(() => consoleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);
  const scrollToCrud = useCallback(() => {
    setTimeout(() => crudSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const grouped = useMemo(
    () =>
      groups.map((group: DatabasePreviewGroup) => ({
        ...group,
        Icon: groupIconMap[group.type] ?? FileTextIcon,
      })),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    if (!query) return grouped;
    return grouped
      .map((group: (typeof grouped)[number]) => {
        const matchesType = group.type.toLowerCase().includes(query);
        const objects = group.objects.filter((obj: string) =>
          obj.toLowerCase().includes(query)
        );
        if (!matchesType && objects.length === 0) return null;
        return matchesType
          ? group
          : { ...group, objects };
      })
      .filter((group: (typeof grouped)[number] | null): group is (typeof grouped)[number] => Boolean(group));
  }, [grouped, groupQuery]);

  const filteredTableDetails = useMemo(() => {
    const query = tableQuery.trim().toLowerCase();
    if (!query) return tableDetails;
    return tableDetails.filter((t: DatabaseTableDetail) => t.name.toLowerCase().includes(query));
  }, [tableDetails, tableQuery]);

  const toggleGroup = (type: string): void => {
    setExpandedGroups((prev: Record<string, boolean>) => ({ ...prev, [type]: !prev[type] }));
  };

  const maxPage = useMemo(() => {
    if (tableRows.length === 0) return 1;
    const pages = tableRows.map((table: DatabasePreviewRow) =>
      Math.max(1, Math.ceil(table.totalRows / pageSize))
    );
    return Math.max(1, ...pages);
  }, [pageSize, tableRows]);

  const totalFks = useMemo(
    () => tableDetails.reduce((sum: number, t: DatabaseTableDetail) => sum + t.foreignKeys.length, 0),
    [tableDetails]
  );
  const totalIndexes = useMemo(
    () => tableDetails.reduce((sum: number, t: DatabaseTableDetail) => sum + t.indexes.length, 0),
    [tableDetails]
  );

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Database Preview'
        description={
          mode === 'current'
            ? 'Source: Current database'
            : backupName
              ? `Source: ${backupName}`
              : 'No backup selected.'
        }
        actions={
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/databases'>Back to databases</Link>
          </Button>
        }
        className='mb-6'
      />

      {/* Error display */}
      {error && (
        <SectionPanel className='mb-6 p-5'>
          <p className='text-xs text-red-300'>{error}</p>
        </SectionPanel>
      )}

      {loading && (
        <SectionPanel className='p-5'>
          <p className='text-xs text-gray-400'>Loading preview... This may take a moment for backup restores.</p>
        </SectionPanel>
      )}

      {!loading && !error && (
        <div className='space-y-6'>
          {/* ── Database Overview ── */}
          {(databaseSize || tableDetails.length > 0 || enums.length > 0) && (
            <SectionPanel className='p-5'>
              <h2 className='text-sm font-semibold text-white mb-3'>Database Overview</h2>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5'>
                {databaseSize && (
                  <div className='rounded-md border border-border bg-card/80 px-3 py-2'>
                    <p className='text-[11px] uppercase tracking-wider text-gray-500'>Total Size</p>
                    <p className='mt-1 text-sm font-semibold text-gray-200'>{databaseSize}</p>
                  </div>
                )}
                <div className='rounded-md border border-border bg-card/80 px-3 py-2'>
                  <p className='text-[11px] uppercase tracking-wider text-gray-500'>Tables</p>
                  <p className='mt-1 text-sm font-semibold text-gray-200'>{tables.length}</p>
                </div>
                <div className='rounded-md border border-border bg-card/80 px-3 py-2'>
                  <p className='text-[11px] uppercase tracking-wider text-gray-500'>Enums</p>
                  <p className='mt-1 text-sm font-semibold text-gray-200'>{enums.length}</p>
                </div>
                <div className='rounded-md border border-border bg-card/80 px-3 py-2'>
                  <p className='text-[11px] uppercase tracking-wider text-gray-500'>Indexes</p>
                  <p className='mt-1 text-sm font-semibold text-gray-200'>{totalIndexes}</p>
                </div>
                <div className='rounded-md border border-border bg-card/80 px-3 py-2'>
                  <p className='text-[11px] uppercase tracking-wider text-gray-500'>Foreign Keys</p>
                  <p className='mt-1 text-sm font-semibold text-gray-200'>{totalFks}</p>
                </div>
              </div>
            </SectionPanel>
          )}

          {/* ── Tables (Detailed) ── */}
          {tableDetails.length > 0 && (
            <SectionPanel className='p-5'>
              <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
                <div>
                  <h2 className='text-sm font-semibold text-white'>Tables</h2>
                  <span className='text-xs text-gray-500'>
                    {filteredTableDetails.length} of {tableDetails.length} tables
                  </span>
                </div>
                <div className='flex items-center gap-3'>
                  <Input
                    type='search'
                    value={tableQuery}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setTableQuery(event.target.value)}
                    placeholder='Filter tables...'
                    className='h-8 w-full max-w-xs text-xs'
                    aria-label='Filter tables'
                  />
                  <Pagination
                    page={page}
                    totalPages={maxPage}
                    onPageChange={setPage}
                    pageSize={pageSize}
                    onPageSizeChange={(size: number) => {
                      setPage(1);
                      setPageSize(size);
                    }}
                    pageSizeOptions={[10, 20, 50, 100]}
                    showPageSize
                    className='scale-90 origin-right'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                {filteredTableDetails.map((detail: DatabaseTableDetail) => (
                  <TableDetailCard
                    key={detail.name}
                    detail={detail}
                    page={page}
                    pageSize={pageSize}
                    onQueryTable={(name: string): void => {
                      setConsoleSql(`SELECT * FROM "${name}" LIMIT 20`);
                      setShowConsole(true);
                      scrollToConsole();
                    }}
                    onManageTable={(name: string): void => {
                      setCrudTable(name);
                      setShowCrud(true);
                      scrollToCrud();
                    }}
                  />
                ))}
              </div>
            </SectionPanel>
          )}

          {/* ── Tables fallback (no details, e.g. MongoDB) ── */}
          {tableDetails.length === 0 && tables.length > 0 && (
            <SectionPanel className='p-5'>
              <div className='flex items-center justify-between'>
                <h2 className='text-sm font-semibold text-white'>Tables & Row Estimates</h2>
                <span className='text-xs text-gray-500'>{tables.length} tables</span>
              </div>
              <div className='mt-3 max-h-64 divide-y divide-border overflow-auto rounded-md border border-border bg-card/60'>
                {tables.map((table: DatabasePreviewTable) => (
                  <div key={table.name} className='flex items-center justify-between px-3 py-2 text-xs'>
                    <span className='text-gray-200'>{table.name}</span>
                    <span className='text-gray-400'>~{table.rowEstimate.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </SectionPanel>
          )}

          {/* ── Enums ── */}
          {enums.length > 0 && (
            <SectionPanel className='p-5'>
              <h2 className='text-sm font-semibold text-white mb-3'>
                Enum Types ({enums.length})
              </h2>
              <div className='space-y-2'>
                {enums.map((enumType: DatabaseEnumInfo) => (
                  <div key={enumType.name} className='rounded-md border border-border bg-card/60 px-4 py-3'>
                    <span className='text-xs font-semibold font-mono text-emerald-300'>{enumType.name}</span>
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {enumType.values.map((val: string) => (
                        <Badge key={val} variant='outline' className='text-[10px] font-mono'>
                          {val}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionPanel>
          )}

          {/* ── Schema Objects (backup mode groups) ── */}
          {groups.length > 0 && (
            <SectionPanel className='p-5'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <h2 className='text-sm font-semibold text-white'>Schema Objects</h2>
                  <span className='text-xs text-gray-500'>{filteredGroups.length} groups</span>
                </div>
                <Input
                  type='search'
                  value={groupQuery}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setGroupQuery(event.target.value)}
                  placeholder='Filter objects or types...'
                  className='h-8 w-full max-w-xs text-xs'
                  aria-label='Filter schema objects'
                />
              </div>
              {filteredGroups.length === 0 && (
                <p className='mt-3 text-xs text-gray-500'>No schema objects match the current filter.</p>
              )}
              {filteredGroups.length > 0 && (
                <div className='mt-4 space-y-2'>
                  {filteredGroups.map((group: (typeof filteredGroups)[number]) => {
                    const isExpanded = expandedGroups[group.type] ?? false;
                    return (
                      <div key={group.type} className='rounded-md border border-border bg-card/60'>
                        <Button
                          type='button'
                          onClick={(): void => toggleGroup(group.type)}
                          className='flex w-full items-center justify-between px-3 py-2 text-left text-xs text-gray-200'
                        >
                          <span className='flex items-center gap-2'>
                            <group.Icon className='size-4 text-emerald-200' />
                            <span className='font-semibold'>{group.type} ({group.objects.length})</span>
                          </span>
                          {isExpanded ? (
                            <ChevronDownIcon className='size-4 text-gray-400' />
                          ) : (
                            <ChevronRightIcon className='size-4 text-gray-400' />
                          )}
                        </Button>
                        {isExpanded && (
                          <div className='border-t border-border px-3 py-2 text-xs text-gray-400'>
                            {group.objects.join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionPanel>
          )}

          {/* ── SQL Query Console ── */}
          {dbType === 'postgresql' && (
            <div ref={consoleSectionRef}>
              <SectionPanel className='p-5'>
                <button
                  type='button'
                  onClick={(): void => setShowConsole(!showConsole)}
                  className='flex w-full items-center justify-between'
                >
                  <div className='flex items-center gap-2'>
                    <TerminalIcon className='size-4 text-emerald-300' />
                    <h2 className='text-sm font-semibold text-white'>SQL Console</h2>
                  </div>
                  {showConsole ? (
                    <ChevronDownIcon className='size-4 text-gray-400' />
                  ) : (
                    <ChevronRightIcon className='size-4 text-gray-400' />
                  )}
                </button>
                {showConsole && (
                  <div className='mt-4'>
                    <SqlQueryConsole
                      defaultDbType='postgresql'
                      initialSql={consoleSql}
                    />
                  </div>
                )}
              </SectionPanel>
            </div>
          )}

          {/* ── CRUD Panel ── */}
          {showCrud && tableDetails.length > 0 && (
            <div ref={crudSectionRef}>
              <SectionPanel className='p-5'>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-2'>
                    <SettingsIcon className='size-4 text-emerald-300' />
                    <h2 className='text-sm font-semibold text-white'>Table Manager</h2>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={(): void => setShowCrud(false)}
                    className='text-xs text-gray-400'
                  >
                  Close
                  </Button>
                </div>
                <CrudPanel
                  tableDetails={tableDetails}
                  defaultTable={crudTable}
                  dbType={dbType}
                />
              </SectionPanel>
            </div>
          )}
        </div>
      )}
    </div>
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
    <Suspense fallback={<div className='p-6 text-sm text-gray-500'>Loading...</div>}>
      <DatabasePreviewPageInner />
    </Suspense>
  );
}