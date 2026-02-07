'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  useFileUploadEvents,
  type FileUploadEventRecord,
} from '@/features/files/hooks/useFileUploadEvents';
import {
  DynamicFilters,
  Pagination,
  RefreshButton,
  SectionPanel,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
  type FilterField,
} from '@/shared/ui';

type FileUploadEventsPanelProps = {
  title?: string;
  description?: string;
};

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
] as const;

const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export function FileUploadEventsPanel({
  title = 'File Uploads Runtime',
  description = 'Track upload successes and failures across services.',
}: FileUploadEventsPanelProps): React.JSX.Element {
  const { toast } = useToast();
  const [status, setStatus] = useState<(typeof statusOptions)[number]['value']>('all');
  const [category, setCategory] = useState('');
  const [projectId, setProjectId] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      status,
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(projectId.trim() ? { projectId: projectId.trim() } : {}),
      ...(query.trim() ? { query: query.trim() } : {}),
      from: fromDate || null,
      to: toDate || null,
    }),
    [page, pageSize, status, category, projectId, query, fromDate, toDate]
  );

  const eventsQuery = useFileUploadEvents(filters);

  useEffect(() => {
    if (eventsQuery.error) {
      toast(eventsQuery.error.message, { variant: 'error' });
    }
  }, [eventsQuery.error, toast]);

  const events = useMemo(() => eventsQuery.data?.events ?? [], [eventsQuery.data]);
  const total = eventsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [...statusOptions] },
    { key: 'category', label: 'Category', type: 'text', placeholder: 'studio, cms, products…' },
    { key: 'projectId', label: 'Project ID', type: 'text', placeholder: 'project id…' },
    { key: 'query', label: 'Search', type: 'text', placeholder: 'filename, error, source…' },
    { key: 'fromDate', label: 'From', type: 'date' },
    { key: 'toDate', label: 'To', type: 'date' },
  ];

  const handleFilterChange = (key: string, value: string): void => {
    setPage(1);
    if (key === 'status') setStatus(value as (typeof statusOptions)[number]['value']);
    if (key === 'category') setCategory(value);
    if (key === 'projectId') setProjectId(value);
    if (key === 'query') setQuery(value);
    if (key === 'fromDate') setFromDate(value);
    if (key === 'toDate') setToDate(value);
  };

  const handleResetFilters = (): void => {
    setStatus('all');
    setCategory('');
    setProjectId('');
    setQuery('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <SectionPanel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-gray-500">
            Total: <span className="text-gray-300">{total}</span>
          </div>
          <RefreshButton
            onRefresh={(): void => {
              void eventsQuery.refetch();
            }}
            isRefreshing={eventsQuery.isFetching}
          />
        </div>
      </div>

      <div className="mt-4">
        <DynamicFilters
          fields={filterFields}
          values={{ status, category, projectId, query, fromDate, toDate }}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          hasActiveFilters={Boolean(status !== 'all' || category || projectId || query || fromDate || toDate)}
          gridClassName="md:grid-cols-4 lg:grid-cols-6"
        />
      </div>

      <SectionPanel className="mt-4 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-gray-400">
                  No upload events found.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event: FileUploadEventRecord) => (
                <TableRow key={event.id}>
                  <TableCell className="text-xs text-gray-400">
                    {formatTimestamp(event.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="text-xs">{event.category ?? '—'}</TableCell>
                  <TableCell className="text-xs">{event.projectId ?? '—'}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium text-gray-200">{event.filename ?? '—'}</div>
                    <div className="max-w-[280px] truncate text-[10px] text-gray-500">
                      {event.filepath ?? ''}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {event.size ? `${Math.round(event.size / 1024)} KB` : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{event.source ?? '—'}</TableCell>
                  <TableCell className="text-xs text-rose-200">{event.errorMessage ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionPanel>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </SectionPanel>
  );
}
