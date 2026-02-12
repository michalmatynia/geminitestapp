'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React from 'react';

import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';

type ImageStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed';

type ImageStudioRunRecord = {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  expectedOutputs: number;
  outputs: Array<{ id: string; filepath: string }>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type RunsResponse = {
  runs: ImageStudioRunRecord[];
  total: number;
};

const STATUS_OPTIONS: Array<{ value: 'all' | ImageStudioRunStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const toDateLabel = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const getStatusClassName = (status: ImageStudioRunStatus): string => {
  if (status === 'running') return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  if (status === 'queued') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
};

export function ImageStudioRunsQueuePanel(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = React.useState<'all' | ImageStudioRunStatus>('all');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);

  const runsQuery = useQuery<RunsResponse>({
    queryKey: QUERY_KEYS.imageStudio.runs({ status: statusFilter }),
    queryFn: async () => {
      return await api.get<RunsResponse>('/api/image-studio/runs', {
        params: {
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          limit: 100,
          offset: 0,
        },
      });
    },
    refetchInterval: autoRefreshEnabled ? 3000 : false,
  });

  const runs = runsQuery.data?.runs ?? [];
  const runningCount = runs.filter((run) => run.status === 'running').length;
  const queuedCount = runs.filter((run) => run.status === 'queued').length;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>Image Studio Runs</div>
          <div className='text-xs text-gray-400'>
            Queue-backed generation runs persisted from Image Studio.
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={() => setAutoRefreshEnabled((prev) => !prev)}
          >
            {autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
          </Button>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={() => { void runsQuery.refetch(); }}
            disabled={runsQuery.isFetching}
          >
            {runsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-4'>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Total</div>
          <div className='mt-1 text-sm text-white'>{runsQuery.data?.total ?? 0}</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Queued</div>
          <div className='mt-1 text-sm text-amber-200'>{queuedCount}</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Running</div>
          <div className='mt-1 text-sm text-sky-200'>{runningCount}</div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Filter</div>
          <div className='mt-1'>
            <Label className='sr-only'>Status Filter</Label>
            <Select
              value={statusFilter}
              onValueChange={(value: string) => setStatusFilter(value as 'all' | ImageStudioRunStatus)}
            >
              <SelectTrigger className='h-8 border-border bg-card/70 text-xs text-white'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='border-border bg-gray-900 text-white'>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className='overflow-x-auto rounded-md border border-border/60'>
        <table className='min-w-full divide-y divide-border/60 text-xs'>
          <thead className='bg-card/70 text-[11px] uppercase tracking-wide text-gray-400'>
            <tr>
              <th className='px-3 py-2 text-left'>Run</th>
              <th className='px-3 py-2 text-left'>Project</th>
              <th className='px-3 py-2 text-left'>Status</th>
              <th className='px-3 py-2 text-left'>Outputs</th>
              <th className='px-3 py-2 text-left'>Created</th>
              <th className='px-3 py-2 text-left'>Started</th>
              <th className='px-3 py-2 text-left'>Finished</th>
              <th className='px-3 py-2 text-left'>Error</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border/40 bg-card/30'>
            {runsQuery.isLoading ? (
              <tr>
                <td colSpan={8} className='px-3 py-6 text-center text-gray-400'>
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 className='size-4 animate-spin' />
                    Loading image studio runs...
                  </span>
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={8} className='px-3 py-6 text-center text-gray-500'>
                  No image studio runs found.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className='text-gray-200'>
                  <td className='px-3 py-2 font-mono text-[11px]'>{run.id.slice(0, 12)}...</td>
                  <td className='px-3 py-2'>{run.projectId}</td>
                  <td className='px-3 py-2'>
                    <span className={`inline-flex rounded-full border px-2 py-[1px] text-[10px] ${getStatusClassName(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className='px-3 py-2'>
                    {run.outputs.length}/{run.expectedOutputs}
                  </td>
                  <td className='px-3 py-2'>{toDateLabel(run.createdAt)}</td>
                  <td className='px-3 py-2'>{toDateLabel(run.startedAt)}</td>
                  <td className='px-3 py-2'>{toDateLabel(run.finishedAt)}</td>
                  <td className='px-3 py-2 text-rose-200'>{run.errorMessage ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
