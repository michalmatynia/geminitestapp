'use client';

import {} from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { isObjectRecord } from '@/shared/utils/object-utils';
import {
  Pagination,
  Card,
  Badge,
  Alert,
  LoadingState,
  Button,
  PanelFilters,
  SearchInput,
  Checkbox,
} from '@/shared/ui';
import type { FilterField } from '@/shared/contracts/ui';

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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

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
      ...(isObjectRecord(event.payload) ? event.payload : {}),
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
    if (!event || !isObjectRecord(event.payload)) continue;
    const executionMeta = event.payload['executionMeta'];
    if (isObjectRecord(executionMeta)) {
      return executionMeta;
    }
  }
  return null;
};

const classifyRunDuration = (run: HistoryRunRecord): 'unknown' | 'fast' | 'moderate' | 'slow' => {
  if (!run.startedAt || !run.finishedAt) return 'unknown';
  const started = new Date(run.startedAt).getTime();
  const finished = new Date(run.finishedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished <= started) {
    return 'unknown';
  }
  const ms = finished - started;
  if (ms <= 10_000) return 'fast';
  if (ms <= 60_000) return 'moderate';
  return 'slow';
};

const resolveExecutionSummary = (
  _run: HistoryRunRecord,
  executionMeta: Record<string, unknown> | null
): {
  operationLabel: string;
  model: string | null;
  costPerOutputUsd: number | null;
} => {
  const record = asRecord(executionMeta);
  const operationRaw = record?.['operation'];
  const operation =
    operationRaw === 'center_object' || operationRaw === 'generate' ? operationRaw : 'generate';
  const operationLabel = operation === 'center_object' ? 'Center object' : 'Generation';

  const modelUsedRaw = record?.['modelUsed'];
  const model =
    typeof modelUsedRaw === 'string' && modelUsedRaw.trim().length > 0 ? modelUsedRaw.trim() : null;

  const generationCosts = asRecord(record?.['generationCosts']);
  let costPerOutputUsd: number | null = null;
  if (generationCosts) {
    const value = generationCosts['totalCostUsdPerOutput'];
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseFloat(value)
          : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      costPerOutputUsd = parsed;
    }
  }

  return { operationLabel, model, costPerOutputUsd };
};

const PAGE_SIZE = 50;

export function ProjectGenerationHistoryTab(): React.JSX.Element {
  const { projectId } = useProjectsState();
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | HistoryRunRecord['status']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSlowOnly, setShowSlowOnly] = useState(false);

  useEffect(() => {
    setPage(1);
    setExpandedRunId(null);
  }, [projectId]);

  const runsQuery = createListQueryV2<HistoryRunsResponse, HistoryRunsResponse>({
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
    meta: {
      source: 'image-studio.project-history.runs',
      operation: 'list',
      resource: 'image-studio.runs',
      domain: 'image_studio',
      tags: ['image-studio', 'history'],
    },
  });

  const runs = useMemo(
    () => (Array.isArray(runsQuery.data?.runs) ? runsQuery.data?.runs : []),
    [runsQuery.data?.runs]
  );
  const filteredRuns = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return runs.filter((run) => {
      if (statusFilter !== 'all' && run.status !== statusFilter) return false;
      if (showSlowOnly && classifyRunDuration(run) !== 'slow') return false;
      if (!needle) return true;
      const prompt = run.request?.prompt?.toLowerCase() ?? '';
      const error = run.errorMessage?.toLowerCase() ?? '';
      const modelRaw = resolveExecutionSummary(run, resolveExecutionMeta(run)).model ?? '';
      const model = modelRaw.toLowerCase();
      return prompt.includes(needle) || error.includes(needle) || model.includes(needle);
    });
  }, [runs, statusFilter, searchTerm, showSlowOnly]);
  const total = useMemo(() => {
    const value = runsQuery.data?.total;
    const fallback = runs.length;
    const baseTotal =
      typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
    // When filters are applied, show the count of filtered runs on the current page.
    return filteredRuns.length > 0 || (statusFilter === 'all' && !searchTerm && !showSlowOnly)
      ? statusFilter === 'all' && !searchTerm && !showSlowOnly
        ? baseTotal
        : filteredRuns.length
      : baseTotal;
  }, [
    runs.length,
    runsQuery.data?.total,
    filteredRuns.length,
    statusFilter,
    searchTerm,
    showSlowOnly,
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(total, page * PAGE_SIZE);

  const filters: FilterField[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'all', label: 'All' },
        { value: 'queued', label: 'Queued' },
        { value: 'running', label: 'Running' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
      ],
    },
  ];

  if (!projectId) {
    return (
      <Card
        variant='subtle-compact'
        padding='md'
        className='border-border/60 bg-card/40 text-sm text-muted-foreground'
      >
        Select a project to view generation history.
      </Card>
    );
  }

  if (runsQuery.isLoading) {
    return (
      <Card
        variant='subtle-compact'
        padding='md'
        className='flex items-center gap-2 border-border/60 bg-card/40 text-sm text-muted-foreground'
      >
        <LoadingState message='Loading generation history...' />
      </Card>
    );
  }

  if (runsQuery.error) {
    return (
      <Alert variant='error'>
        {runsQuery.error.message || 'Failed to load generation history.'}
      </Alert>
    );
  }

  if (runs.length === 0) {
    return (
      <Card
        variant='subtle-compact'
        padding='md'
        className='border-border/60 bg-card/40 text-sm text-muted-foreground'
      >
        No generation runs yet for this project.
      </Card>
    );
  }

  return (
    <div className='space-y-3'>
      <PanelFilters
        filters={filters}
        values={{ status: statusFilter }}
        onFilterChange={(key, value) => {
          if (key === 'status') setStatusFilter(value as typeof statusFilter);
        }}
        actions={
          <div className='flex flex-wrap items-center gap-3'>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='show-slow'
                checked={showSlowOnly}
                onCheckedChange={(checked) => setShowSlowOnly(Boolean(checked))}
              />
              <label
                htmlFor='show-slow'
                className='text-[11px] text-muted-foreground cursor-pointer'
              >
                Slow only
              </label>
            </div>
            <SearchInput
              placeholder='Search prompt / model / error'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              size='sm'
              className='h-7 w-44'
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              variant='compact'
              showLabels={false}
            />
          </div>
        }
        compact
        className='rounded-lg border border-border/60 bg-card/40 p-3'
      />

      <div className='flex items-center justify-between px-1 text-[10px] text-muted-foreground uppercase font-bold tracking-wider'>
        <span>
          Showing {pageStart}-{pageEnd} of {total} runs
        </span>
      </div>

      {filteredRuns.map((run) => {
        const prompt = run.request?.prompt?.trim() ?? '';
        const promptSummary =
          prompt.length > 120 ? `${prompt.slice(0, 120)}...` : prompt || 'No prompt';
        const isExpanded = expandedRunId === run.id;
        const timeline = resolveRunTimeline(run);
        const executionMeta = resolveExecutionMeta(run);
        const executionSummary = resolveExecutionSummary(run, executionMeta);
        const durationClass = classifyRunDuration(run);
        const primaryOutput = run.outputs[0] ?? null;
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
          <Card key={run.id} variant='subtle' padding='sm' className='border-border/60 bg-card/40'>
            <button
              type='button'
              onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
              className='w-full text-left'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  variant={
                    run.status === 'completed'
                      ? 'success'
                      : run.status === 'failed'
                        ? 'error'
                        : run.status === 'running'
                          ? 'info'
                          : 'warning'
                  }
                  className='font-bold uppercase'
                >
                  {run.status}
                </Badge>
                <span className='text-xs text-muted-foreground'>
                  {formatDateTime(run.createdAt)}
                </span>
                <span className='text-xs text-muted-foreground'>
                  Outputs {run.outputs.length}/{run.expectedOutputs}
                </span>
                <span className='text-xs text-muted-foreground'>
                  Dispatch {run.dispatchMode ?? 'n/a'}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {executionSummary.operationLabel}
                  {executionSummary.model ? ` • ${executionSummary.model}` : ''}
                  {typeof executionSummary.costPerOutputUsd === 'number'
                    ? ` • ~$${executionSummary.costPerOutputUsd.toFixed(4)}/img`
                    : ''}
                </span>
                {durationClass === 'slow' ? (
                  <Badge variant='warning' className='text-[10px] uppercase'>
                    Slow
                  </Badge>
                ) : null}
              </div>
              <div className='mt-1 text-sm text-foreground'>{promptSummary}</div>
              {run.status === 'failed' && run.errorMessage ? (
                <div className='mt-1 text-xs text-red-400 line-clamp-1'>
                  Error: {run.errorMessage}
                </div>
              ) : null}
            </button>

            <div className='mt-2 flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                size='xs'
                onClick={(event) => {
                  event.stopPropagation();
                  if (!prompt) return;
                  void navigator.clipboard.writeText(prompt).catch(() => {});
                }}
              >
                Copy prompt
              </Button>
              <Button
                variant='outline'
                size='xs'
                onClick={(event) => {
                  event.stopPropagation();
                  void navigator.clipboard.writeText(run.id).catch(() => {});
                }}
              >
                Copy run ID
              </Button>
              {primaryOutput ? (
                <Button
                  asChild
                  variant='outline'
                  size='xs'
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <a href={primaryOutput.filepath} target='_blank' rel='noopener noreferrer'>
                    Open first output
                  </a>
                </Button>
              ) : null}
            </div>

            {isExpanded ? (
              <div className='mt-3 space-y-3 border-t border-border/50 pt-3'>
                <div className='grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4'>
                  <div>
                    <span className='text-foreground'>Run ID:</span> {run.id}
                  </div>
                  <div>
                    <span className='text-foreground'>Started:</span>{' '}
                    {formatDateTime(run.startedAt)}
                  </div>
                  <div>
                    <span className='text-foreground'>Finished:</span>{' '}
                    {formatDateTime(run.finishedAt)}
                  </div>
                  <div>
                    <span className='text-foreground'>Duration:</span>{' '}
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </div>
                </div>

                <div>
                  <div className='mb-1 text-xs font-semibold text-foreground'>Prompt</div>
                  <pre className='max-h-28 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-xs text-gray-200 whitespace-pre-wrap'>
                    {prompt || 'n/a'}
                  </pre>
                </div>

                <div>
                  <div className='mb-1 text-xs font-semibold text-foreground'>Lifecycle Events</div>
                  <div className='space-y-1'>
                    {timeline.map((event) => (
                      <Card
                        key={event.id}
                        variant='subtle-compact'
                        padding='sm'
                        className='border-border/50 bg-card/50 text-xs'
                      >
                        <div className='text-foreground'>{event.label}</div>
                        <div className='text-muted-foreground'>{formatDateTime(event.at)}</div>
                        <pre className='mt-1 max-h-24 overflow-auto rounded bg-black/30 p-1.5 text-[11px] text-gray-200'>
                          {toPrettyJson(event.payload)}
                        </pre>
                      </Card>
                    ))}
                  </div>
                </div>

                {run.outputs.length > 0 ? (
                  <div>
                    <div className='mb-1 text-xs font-semibold text-foreground'>
                      Generated Outputs
                    </div>
                    <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
                      {run.outputs.map((output, index) => (
                        <Card
                          key={output.id}
                          variant='subtle-compact'
                          padding='sm'
                          className='border-border/50 bg-card/50'
                        >
                          <a
                            href={output.filepath}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='block relative h-36 w-full rounded overflow-hidden'
                          >
                            <Image
                              src={output.filepath}
                              alt={output.filename || `Output ${index + 1}`}
                              fill
                              className='object-cover'
                              unoptimized
                            />
                          </a>
                          <div className='mt-2 space-y-0.5 text-[11px] text-muted-foreground'>
                            <div className='text-foreground'>
                              #{index + 1} {output.filename || output.id}
                            </div>
                            <div>File ID: {output.id}</div>
                            <div>Size: {formatBytes(output.size)}</div>
                            <div>
                              Resolution: {output.width ?? '?'} x {output.height ?? '?'}
                            </div>
                          </div>
                          <div className='mt-1 flex flex-wrap items-center gap-1.5 text-[11px]'>
                            <Button
                              asChild
                              size='xs'
                              variant='outline'
                              className='h-6 px-2 text-[11px]'
                            >
                              <a href={output.filepath} target='_blank' rel='noopener noreferrer'>
                                Open
                              </a>
                            </Button>
                            <Button
                              size='xs'
                              variant='outline'
                              className='h-6 px-2 text-[11px]'
                              onClick={() => {
                                void navigator.clipboard.writeText(output.filepath).catch(() => {});
                              }}
                            >
                              Copy URL
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card
                    variant='subtle-compact'
                    padding='sm'
                    className='border-border/50 bg-card/50 text-xs text-muted-foreground'
                  >
                    No output files were recorded for this run.
                  </Card>
                )}

                <div className='grid gap-3 lg:grid-cols-2'>
                  <div>
                    <div className='mb-1 text-xs font-semibold text-foreground'>
                      Request Payload
                    </div>
                    <pre className='max-h-52 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-[11px] text-gray-200'>
                      {toPrettyJson(run.request ?? {})}
                    </pre>
                  </div>
                  <div>
                    <div className='mb-1 text-xs font-semibold text-foreground'>
                      API Response Snapshot
                    </div>
                    <pre className='max-h-52 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-[11px] text-gray-200'>
                      {toPrettyJson(apiResponseSnapshot)}
                    </pre>
                  </div>
                </div>

                <div>
                  <div className='mb-1 text-xs font-semibold text-foreground'>
                    Execution Metadata
                  </div>
                  <pre className='max-h-52 overflow-auto rounded border border-border/60 bg-black/30 p-2 text-[11px] text-gray-200'>
                    {toPrettyJson(executionMeta ?? { note: 'No execution metadata recorded.' })}
                  </pre>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
