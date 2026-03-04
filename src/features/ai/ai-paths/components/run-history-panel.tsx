'use client';

import React from 'react';

import type { AiPathRunRecord, RuntimeHistoryEntry } from '@/shared/lib/ai-paths';
import {
  Button,
  Label,
  SelectSimple,
  StatusBadge,
  Alert,
  EmptyState,
  Card,
  Hint,
} from '@/shared/ui';

import { buildHistoryNodeOptions } from './run-history-utils';
import { RunHistoryEntries } from './RunHistoryEntries';
import { useRunHistoryActions, useRunHistoryState } from '../context';

export type RunHistoryFilter = 'all' | 'active' | 'failed' | 'dead';

export function RunHistoryPanel(): React.JSX.Element {
  const runHistoryState = useRunHistoryState();
  const { runList: resolvedRuns, runsRefreshing: resolvedIsRefreshing, expandedRunHistory, runHistorySelection } =
    runHistoryState;
  const {
    setRunFilter: setRunFilterContext,
    setExpandedRunHistory,
    setRunHistorySelection,
    refreshRuns,
    openRunDetail,
    resumeRun,
    cancelRun,
    requeueDeadLetter,
  } = useRunHistoryActions();
  const [compareMode, setCompareMode] = React.useState(false);
  const [primaryRunId, setPrimaryRunId] = React.useState<string | null>(null);
  const [secondaryRunId, setSecondaryRunId] = React.useState<string | null>(null);
  const handleRefresh = (): void => {
    void refreshRuns().catch(() => {});
  };
  const handleOpenRunDetail = (runId: string): void => {
    openRunDetail(runId);
  };
  const handleResumeRun = (runId: string, mode: 'resume' | 'replay'): void => {
    void resumeRun(runId, mode).catch(() => {});
  };
  const handleCancelRun = (runId: string): void => {
    void cancelRun(runId).catch(() => {});
  };
  const handleRequeueDeadLetter = (runId: string): void => {
    void requeueDeadLetter(runId).catch(() => {});
  };
  const rawRunFilter = runHistoryState.runFilter as string;

  const runFilter: RunHistoryFilter = React.useMemo((): RunHistoryFilter => {
    if (rawRunFilter === 'active' || rawRunFilter === 'running' || rawRunFilter === 'queued') {
      return 'active';
    }
    if (rawRunFilter === 'failed') return 'failed';
    if (rawRunFilter === 'dead') return 'dead';
    return 'all';
  }, [rawRunFilter]);
  const EmptyStateComponent = EmptyState;

  const setRunFilter = React.useCallback(
    (nextFilter: RunHistoryFilter): void => {
      setRunFilterContext(nextFilter);
    },
    [setRunFilterContext]
  );

  const filteredRunList = React.useMemo((): AiPathRunRecord[] => {
    if (runFilter === 'all') return resolvedRuns;
    if (runFilter === 'active') {
      return resolvedRuns.filter(
        (run: AiPathRunRecord): boolean => run.status === 'queued' || run.status === 'running'
      );
    }
    if (runFilter === 'failed') {
      return resolvedRuns.filter(
        (run: AiPathRunRecord): boolean => run.status === 'failed' || run.status === 'paused'
      );
    }
    return resolvedRuns.filter((run: AiPathRunRecord): boolean => run.status === 'dead_lettered');
  }, [runFilter, resolvedRuns]);

  const primaryRun = React.useMemo(
    () => filteredRunList.find((run: AiPathRunRecord) => run.id === primaryRunId) ?? null,
    [filteredRunList, primaryRunId]
  );

  const secondaryRun = React.useMemo(
    () => filteredRunList.find((run: AiPathRunRecord) => run.id === secondaryRunId) ?? null,
    [filteredRunList, secondaryRunId]
  );

  type RuntimeTraceMeta = {
    profile?: {
      summary?: {
        durationMs?: number | null;
        iterationCount?: number | null;
      } | null;
    } | null;
  };

  const getRuntimeSummary = (run: AiPathRunRecord | null) => {
    if (!run?.meta || typeof run.meta !== 'object') {
      return { durationMs: null as number | null, iterations: null as number | null };
    }
    const rawTrace = run.meta['runtimeTrace'] as RuntimeTraceMeta | undefined;
    const duration =
      typeof rawTrace?.profile?.summary?.durationMs === 'number'
        ? rawTrace.profile.summary.durationMs
        : null;
    const iterations =
      typeof rawTrace?.profile?.summary?.iterationCount === 'number'
        ? rawTrace.profile.summary.iterationCount
        : null;
    return { durationMs: duration, iterations };
  };

  const getRuntimeFingerprint = (run: AiPathRunRecord | null): string | null => {
    if (!run?.meta || typeof run.meta !== 'object') return null;
    const raw = run.meta['runtimeFingerprint'];
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return (
    <Card variant='subtle' padding='md' className='bg-card/60'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-3'>
          <Hint size='xs' uppercase={false} className='font-semibold text-white'>
            Run History
          </Hint>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={handleRefresh}
            disabled={resolvedIsRefreshing}
          >
            {resolvedIsRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <div className='flex items-center gap-2 text-[10px]'>
          <Button
            type='button'
            className={`rounded-md border px-2 py-1 ${
              compareMode
                ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                : 'text-gray-300 hover:bg-muted/60'
            }`}
            onClick={(): void => {
              setCompareMode((prev) => !prev);
              setPrimaryRunId(null);
              setSecondaryRunId(null);
            }}
          >
            {compareMode ? 'Exit compare' : 'Compare runs'}
          </Button>
        </div>
      </div>
      <div className='mb-3 flex flex-wrap gap-2'>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'failed', label: 'Failed' },
          { id: 'dead', label: 'Dead-letter' },
        ].map(
          (filter: { id: string; label: string }): React.JSX.Element => (
            <Button
              key={filter.id}
              type='button'
              className={`rounded-md border px-2 py-1 text-[10px] ${
                runFilter === filter.id
                  ? 'border-emerald-500/50 text-emerald-200'
                  : 'text-gray-300 hover:bg-muted/60'
              }`}
              onClick={(): void => setRunFilter(filter.id as RunHistoryFilter)}
            >
              {filter.label}
            </Button>
          )
        )}
      </div>
      {filteredRunList.length === 0 ? (
        <EmptyStateComponent
          title='No runs yet'
          description='Execute a path to see your run history and detailed node outputs.'
          variant='compact'
          className='py-8'
        />
      ) : (
        <div className='space-y-2 text-xs text-gray-300'>
          {filteredRunList.slice(0, 6).map((run: AiPathRunRecord): React.JSX.Element => {
            const runHistory = (
              run.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | undefined
            )?.history;
            const runHistoryOptions = buildHistoryNodeOptions(
              runHistory,
              null,
              run.graph?.nodes ?? null
            );
            const isScheduledRun = run.triggerEvent === 'scheduled_run';
            const rawSelectedHistoryNodeId = runHistorySelection[run.id] ?? null;
            const selectedHistoryNodeId = runHistoryOptions.some(
              (option: { id: string }) => option.id === rawSelectedHistoryNodeId
            )
              ? rawSelectedHistoryNodeId
              : (runHistoryOptions[0]?.id ?? null);
            const historyOpen = Boolean(expandedRunHistory[run.id]);
            const historyEntries =
              selectedHistoryNodeId && runHistory ? (runHistory[selectedHistoryNodeId] ?? []) : [];
            const isPrimary = compareMode && primaryRunId === run.id;
            const isSecondary = compareMode && secondaryRunId === run.id;
            return (
              <Card key={run.id} variant='subtle-compact' padding='sm' className='bg-card/70'>
                <div className='flex items-center justify-between gap-2'>
                  <div>
                    <StatusBadge status={run.status} size='sm' className='font-bold' />
                    {isScheduledRun ? (
                      <div className='mt-1'>
                        <StatusBadge
                          status='Scheduled'
                          variant='warning'
                          size='sm'
                          className='font-bold'
                        />
                      </div>
                    ) : null}
                    <div className='mt-1 text-[11px] text-gray-400'>
                      {run.createdAt ? new Date(run.createdAt).toLocaleString() : '-'}
                    </div>
                    {typeof run.retryCount === 'number' && typeof run.maxAttempts === 'number' && (
                      <div className='text-[10px] text-gray-500'>
                        Retries: {run.retryCount}/{run.maxAttempts}
                      </div>
                    )}
                    {run.nextRetryAt && (
                      <div className='mt-1'>
                        <StatusBadge
                          status={'Retry at ' + new Date(run.nextRetryAt).toLocaleString()}
                          variant='warning'
                          size='sm'
                        />
                      </div>
                    )}
                  </div>
                  <div className='flex items-center gap-2'>
                    {compareMode && (
                      <div className='mr-2 flex flex-col items-end gap-1 text-[9px] text-gray-400'>
                        <Button
                          type='button'
                          variant='outline'
                          className={`h-6 px-2 ${
                            isPrimary
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                              : 'border-border text-gray-300 hover:bg-muted/60'
                          }`}
                          onClick={(): void =>
                            setPrimaryRunId((prev) => (prev === run.id ? null : run.id))
                          }
                        >
                          {isPrimary ? 'Primary (A)' : 'Set A'}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          className={`h-6 px-2 ${
                            isSecondary
                              ? 'border-amber-500/60 bg-amber-500/10 text-amber-100'
                              : 'border-border text-gray-300 hover:bg-muted/60'
                          }`}
                          onClick={(): void =>
                            setSecondaryRunId((prev) => (prev === run.id ? null : run.id))
                          }
                          disabled={isPrimary}
                        >
                          {isSecondary ? 'Secondary (B)' : 'Set B'}
                        </Button>
                      </div>
                    )}
                    <Button
                      type='button'
                      className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
                      onClick={(): void => handleOpenRunDetail(run.id)}
                    >
                      Details
                    </Button>
                    <Button
                      type='button'
                      className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
                      onClick={(): void => {
                        setExpandedRunHistory((prev: Record<string, boolean>) => ({
                          ...prev,
                          [run.id]: !prev[run.id],
                        }));
                        if (!runHistorySelection[run.id] && runHistoryOptions[0]?.id) {
                          setRunHistorySelection((prev: Record<string, string>) => ({
                            ...prev,
                            [run.id]: runHistoryOptions[0]?.id ?? '',
                          }));
                        }
                      }}
                    >
                      {historyOpen ? 'Hide history' : 'History'}
                    </Button>
                    {(run.status === 'failed' || run.status === 'paused') && (
                      <Button
                        type='button'
                        className='rounded-md border px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/10'
                        onClick={(): void => handleResumeRun(run.id, 'resume')}
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      type='button'
                      className='rounded-md border px-2 py-1 text-[10px] text-sky-200 hover:bg-sky-500/10'
                      onClick={(): void => handleResumeRun(run.id, 'replay')}
                    >
                      Replay
                    </Button>
                    {(run.status === 'queued' || run.status === 'running') && (
                      <Button
                        type='button'
                        className='rounded-md border px-2 py-1 text-[10px] text-rose-200 hover:bg-rose-500/10'
                        onClick={(): void => handleCancelRun(run.id)}
                      >
                        Cancel
                      </Button>
                    )}
                    {run.status === 'dead_lettered' && (
                      <Button
                        type='button'
                        className='rounded-md border px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/10'
                        onClick={(): void => handleRequeueDeadLetter(run.id)}
                      >
                        Requeue
                      </Button>
                    )}
                  </div>
                </div>
                {run.errorMessage && (
                  <Alert variant='error' className='mt-2 px-2 py-1 text-[10px]'>
                    {run.errorMessage}
                  </Alert>
                )}
                {historyOpen && (
                  <Card
                    variant='subtle-compact'
                    padding='sm'
                    className='mt-2 border-border/70 bg-black/20'
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <Label className='text-[10px] uppercase text-gray-500'>History</Label>
                      {runHistory ? (
                        runHistoryOptions.length > 1 ? (
                          <SelectSimple
                            size='sm'
                            value={selectedHistoryNodeId ?? ''}
                            onValueChange={(value: string): void =>
                              setRunHistorySelection((prev: Record<string, string>) => ({
                                ...prev,
                                [run.id]: value,
                              }))
                            }
                            options={runHistoryOptions.map(
                              (option: { id: string; label: string }) => ({
                                value: option.id,
                                label: option.label,
                              })
                            )}
                            triggerClassName='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'
                            placeholder='Select node'
                          />
                        ) : (
                          <div className='text-[11px] text-gray-400'>
                            {runHistoryOptions[0]?.label ?? 'No nodes'}
                          </div>
                        )
                      ) : null}
                    </div>
                    {runHistory && selectedHistoryNodeId ? (
                      <div className='mt-3'>
                        <RunHistoryEntries
                          entries={historyEntries}
                          emptyMessage='No history for this node.'
                        />
                      </div>
                    ) : (
                      <div className='mt-2 text-[11px] text-gray-500'>
                        No history recorded for this run.
                      </div>
                    )}
                  </Card>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {compareMode && primaryRun && secondaryRun && (
        <Card
          variant='subtle-compact'
          padding='sm'
          className='mt-4 border-border/70 bg-black/30 text-[11px] text-gray-200'
        >
          <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
            <Label className='text-[10px] uppercase text-gray-500'>Compare runs (A vs B)</Label>
            <div className='text-[10px] text-gray-500'>
              A: <span className='font-mono'>{primaryRun.id}</span> · B:{' '}
              <span className='font-mono'>{secondaryRun.id}</span>
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            {[primaryRun, secondaryRun].map(
              (run: AiPathRunRecord, index: number): React.JSX.Element => {
                const { durationMs, iterations } = getRuntimeSummary(run);
                const fingerprint = getRuntimeFingerprint(run);
                const label = index === 0 ? 'Run A' : 'Run B';
                return (
                  <div
                    key={run.id}
                    className='rounded-md border border-border/60 bg-card/40 p-3 space-y-1'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <span className='font-semibold text-white'>{label}</span>
                      <span className='rounded-full border border-border/70 px-2 py-px text-[9px] uppercase text-gray-300'>
                        {run.status}
                      </span>
                    </div>
                    <div className='text-[10px] text-gray-400'>
                      Created: {run.createdAt ? new Date(run.createdAt).toLocaleString() : '–'}
                    </div>
                    <div className='text-[10px] text-gray-400'>
                      Finished: {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '–'}
                    </div>
                    <div className='text-[10px] text-gray-400'>
                      Runtime:{' '}
                      {typeof durationMs === 'number' ? `${durationMs.toFixed(0)}ms` : 'n/a'}
                    </div>
                    <div className='text-[10px] text-gray-400'>
                      Iterations: {typeof iterations === 'number' ? iterations : 'n/a'}
                    </div>
                    <div className='text-[10px] text-gray-400'>
                      Retries:{' '}
                      {typeof run.retryCount === 'number' && typeof run.maxAttempts === 'number'
                        ? `${run.retryCount}/${run.maxAttempts}`
                        : 'n/a'}
                    </div>
                    <div className='text-[10px] text-gray-400'>
                      Fingerprint:{' '}
                      <span className='font-mono'>{fingerprint ? fingerprint : 'n/a'}</span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </Card>
      )}
    </Card>
  );
}
