'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { Button } from '@/shared/ui';

import { useProjectsState } from '../context/ProjectsContext';
import { studioKeys } from '../hooks/useImageStudioQueries';

type HistoryRunOutput = {
  id: string;
  filepath: string;
  filename: string;
  size: number;
  width: number | null;
  height: number | null;
};

type HistoryRunRequest = {
  prompt?: string;
  asset?: { filepath?: string; id?: string };
  referenceAssets?: Array<{ filepath?: string; id?: string }>;
  mask?: unknown;
  studioSettings?: Record<string, unknown>;
};

type HistoryRunRecord = {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  dispatchMode: 'queued' | 'inline' | null;
  request: HistoryRunRequest;
  expectedOutputs: number;
  outputs: HistoryRunOutput[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents?: Array<{
    id: string;
    type: string;
    source: 'api' | 'queue' | 'worker' | 'stream' | 'client';
    message: string;
    at: string;
    payload?: Record<string, unknown>;
  }>;
};

type HistoryRunsResponse = {
  runs?: HistoryRunRecord[];
  total?: number;
};

type RunTimelineEvent = {
  id: string;
  label: string;
  at: string | null;
  payload: Record<string, unknown>;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatDuration = (startedAt: string | null, finishedAt: string | null): string => {
  if (!startedAt || !finishedAt) return 'n/a';
  const started = new Date(startedAt).getTime();
  const finished = new Date(finishedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return 'n/a';
  const ms = finished - started;
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};

const formatBytes = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const toPrettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildFallbackRunTimeline = (run: HistoryRunRecord): RunTimelineEvent[] => {
  const events: RunTimelineEvent[] = [
    {
      id: `${run.id}:queued`,
      label: 'API response: run accepted',
      at: run.createdAt,
      payload: {
        runId: run.id,
        status: 'queued',
        dispatchMode: run.dispatchMode,
        expectedOutputs: run.expectedOutputs,
      },
    },
  ];

  if (run.startedAt) {
    events.push({
      id: `${run.id}:running`,
      label: 'Callback received: running',
      at: run.startedAt,
      payload: {
        runId: run.id,
        status: 'running',
      },
    });
  }

  if (run.finishedAt) {
    events.push({
      id: `${run.id}:terminal`,
      label: run.status === 'failed' ? 'Callback received: failed' : 'Callback received: completed',
      at: run.finishedAt,
      payload: {
        runId: run.id,
        status: run.status,
        outputCount: run.outputs.length,
        ...(run.errorMessage ? { errorMessage: run.errorMessage } : {}),
      },
    });
  } else if (run.status === 'running') {
    events.push({
      id: `${run.id}:heartbeat`,
      label: 'Callback stream heartbeat',
      at: run.updatedAt,
      payload: {
        runId: run.id,
        status: run.status,
        updatedAt: run.updatedAt,
      },
    });
  }

  return events;
};

const resolveRunTimeline = (run: HistoryRunRecord): RunTimelineEvent[] => {
  const storedEvents = Array.isArray(run.historyEvents) ? run.historyEvents : [];
  if (storedEvents.length === 0) {
    return buildFallbackRunTimeline(run);
  }
  const mapped = storedEvents.map((event) => ({
    id: event.id,
    label: `${event.source} • ${event.type}`,
    at: event.at,
    payload: {
      message: event.message,
      ...(isRecord(event.payload) ? event.payload : {}),
    },
  }));
  return mapped.sort((left, right) => {
    const leftTime = left.at ? new Date(left.at).getTime() : 0;
    const rightTime = right.at ? new Date(right.at).getTime() : 0;
    return leftTime - rightTime;
  });
};

const resolveExecutionMeta = (run: HistoryRunRecord): Record<string, unknown> | null => {
  const events = Array.isArray(run.historyEvents) ? run.historyEvents : [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!event || !isRecord(event.payload)) continue;
    const executionMeta = event.payload['executionMeta'];
    if (isRecord(executionMeta)) {
      return executionMeta;
    }
  }
  return null;
};

const getStatusClass = (status: HistoryRunRecord['status']): string => {
  if (status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  if (status === 'failed') return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  if (status === 'running') return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
};

const PAGE_SIZE = 50;

export function ProjectGenerationHistoryTab(): React.JSX.Element {
  const { projectId } = useProjectsState();
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    setExpandedRunId(null);
  }, [projectId]);

  const runsQuery = useQuery<HistoryRunsResponse>({
    queryKey: studioKeys.runs({
      projectId: projectId ?? null,
      page,
      pageSize: PAGE_SIZE,
      scope: 'project-history',
    }),
    queryFn: ({ signal }) => {
      if (!projectId) return Promise.resolve({ runs: [], total: 0 });
      return api.get<HistoryRunsResponse>('/api/image-studio/runs', {
        params: {
          projectId,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        },
        signal,
      });
    },
    enabled: Boolean(projectId),
    staleTime: 15_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const runs = useMemo(
    () => (Array.isArray(runsQuery.data?.runs) ? runsQuery.data?.runs : []),
    [runsQuery.data?.runs]
  );
  const total = useMemo(() => {
    const value = runsQuery.data?.total;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : runs.length;
  }, [runs.length, runsQuery.data?.total]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(total, page * PAGE_SIZE);

  if (!projectId) {
    return (
      <div className='rounded border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground'>
        Select a project to view generation history.
      </div>
    );
  }

  if (runsQuery.isLoading) {
    return (
      <div className='flex items-center gap-2 rounded border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        Loading generation history...
      </div>
    );
  }

  if (runsQuery.error) {
    return (
      <div className='rounded border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200'>
        {runsQuery.error.message || 'Failed to load generation history.'}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className='rounded border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground'>
        No generation runs yet for this project.
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 bg-card/40 px-3 py-2 text-xs text-muted-foreground'>
        <span>
          Showing {pageStart}-{pageEnd} of {total} runs
        </span>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            size='xs'
            variant='outline'
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || runsQuery.isFetching}
          >
            Previous
          </Button>
          <span>
            Page {page}/{totalPages}
          </span>
          <Button
            type='button'
            size='xs'
            variant='outline'
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || runsQuery.isFetching}
          >
            Next
          </Button>
        </div>
      </div>
      {runs.map((run) => {
        const prompt = run.request?.prompt?.trim() ?? '';
        const promptSummary = prompt.length > 120 ? `${prompt.slice(0, 120)}...` : prompt || 'No prompt';
        const isExpanded = expandedRunId === run.id;
        const timeline = resolveRunTimeline(run);
        const executionMeta = resolveExecutionMeta(run);
        const apiResponseSnapshot = {
          runId: run.id,
          status: run.status,
          dispatchMode: run.dispatchMode,
          expectedOutputs: run.expectedOutputs,
          outputCount: run.outputs.length,
          errorMessage: run.errorMessage,
          createdAt: run.createdAt,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          updatedAt: run.updatedAt,
        };

        return (
          <div key={run.id} className='rounded-lg border border-border/60 bg-card/40 p-3'>
            <button
              type='button'
              onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
              className='w-full text-left'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] uppercase ${getStatusClass(run.status)}`}>
                  {run.status}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {formatDateTime(run.createdAt)}
                </span>
                <span className='text-xs text-muted-foreground'>
                  Outputs {run.outputs.length}/{run.expectedOutputs}
                </span>
                <span className='text-xs text-muted-foreground'>
                  Dispatch {run.dispatchMode ?? 'n/a'}
                </span>
              </div>
              <div className='mt-1 text-sm text-foreground'>{promptSummary}</div>
            </button>

            {isExpanded ? (
              <div className='mt-3 space-y-3 border-t border-border/50 pt-3'>
                <div className='grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4'>
                  <div><span className='text-foreground'>Run ID:</span> {run.id}</div>
                  <div><span className='text-foreground'>Started:</span> {formatDateTime(run.startedAt)}</div>
                  <div><span className='text-foreground'>Finished:</span> {formatDateTime(run.finishedAt)}</div>
                  <div><span className='text-foreground'>Duration:</span> {formatDuration(run.startedAt, run.finishedAt)}</div>
                </div>

                <div>
                  <div className='mb-1 text-xs font-semibold text-foreground'>Prompt</div>
                  <pre className='max-h-28 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-xs text-gray-200 whitespace-pre-wrap'>{prompt || 'n/a'}</pre>
                </div>

                <div>
                  <div className='mb-1 text-xs font-semibold text-foreground'>Lifecycle Events</div>
                  <div className='space-y-1'>
                    {timeline.map((event) => (
                      <div key={event.id} className='rounded border border-border/50 bg-card/50 p-2 text-xs'>
                        <div className='text-foreground'>{event.label}</div>
                        <div className='text-muted-foreground'>{formatDateTime(event.at)}</div>
                        <pre className='mt-1 max-h-24 overflow-auto rounded bg-black/30 p-1.5 text-[11px] text-gray-200'>
                          {toPrettyJson(event.payload)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>

                {run.outputs.length > 0 ? (
                  <div>
                    <div className='mb-1 text-xs font-semibold text-foreground'>Generated Outputs</div>
                    <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
                      {run.outputs.map((output, index) => (
                        <div key={output.id} className='rounded border border-border/50 bg-card/50 p-2'>
                          <a href={output.filepath} target='_blank' rel='noopener noreferrer'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={output.filepath}
                              alt={output.filename || `Output ${index + 1}`}
                              className='h-36 w-full rounded object-cover'
                              loading='lazy'
                            />
                          </a>
                          <div className='mt-2 space-y-0.5 text-[11px] text-muted-foreground'>
                            <div className='text-foreground'>#{index + 1} {output.filename || output.id}</div>
                            <div>File ID: {output.id}</div>
                            <div>Size: {formatBytes(output.size)}</div>
                            <div>Resolution: {output.width ?? '?'} x {output.height ?? '?'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='rounded border border-border/50 bg-card/50 p-2 text-xs text-muted-foreground'>
                    No output files were recorded for this run.
                  </div>
                )}

                <div className='grid gap-3 lg:grid-cols-2'>
                  <div>
                    <div className='mb-1 text-xs font-semibold text-foreground'>Request Payload</div>
                    <pre className='max-h-52 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-[11px] text-gray-200'>
                      {toPrettyJson(run.request ?? {})}
                    </pre>
                  </div>
                  <div>
                    <div className='mb-1 text-xs font-semibold text-foreground'>API Response Snapshot</div>
                    <pre className='max-h-52 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-[11px] text-gray-200'>
                      {toPrettyJson(apiResponseSnapshot)}
                    </pre>
                  </div>
                </div>

                <div>
                  <div className='mb-1 text-xs font-semibold text-foreground'>Execution Metadata</div>
                  <pre className='max-h-52 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-[11px] text-gray-200'>
                    {toPrettyJson(executionMeta ?? { note: 'No execution metadata recorded.' })}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
