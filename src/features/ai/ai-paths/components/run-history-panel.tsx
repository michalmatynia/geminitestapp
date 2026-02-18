'use client';

import React from 'react';

import type { AiPathRunRecord } from '@/features/ai/ai-paths/lib';
import {
  Button,
  Label,
  SelectSimple,
  StatusBadge,
  Alert,
} from '@/shared/ui';

import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { buildHistoryNodeOptions } from './run-history-utils';
import { RunHistoryEntries } from './RunHistoryEntries';
import { useRunHistoryActions, useRunHistoryState } from '../context';

export type RunHistoryFilter = 'all' | 'active' | 'failed' | 'dead';

export function RunHistoryPanel(): React.JSX.Element {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const runHistoryState = useRunHistoryState();
  const {
    expandedRunHistory,
    runHistorySelection,
  } = runHistoryState;
  const {
    setRunFilter: setRunFilterContext,
    setExpandedRunHistory,
    setRunHistorySelection,
  } = useRunHistoryActions();
  const resolvedRuns = orchestrator.runList;
  const resolvedIsRefreshing = orchestrator.runsQuery.isFetching;
  const handleRefresh = (): void => {
    void orchestrator.runsQuery.refetch().catch(() => {});
  };
  const handleOpenRunDetail = (runId: string): void => {
    void orchestrator.handleOpenRunDetail(runId).catch(() => {});
  };
  const handleResumeRun = (runId: string, mode: 'resume' | 'replay'): void => {
    void orchestrator.handleResumeRun(runId, mode).catch(() => {});
  };
  const handleCancelRun = (runId: string): void => {
    void orchestrator.handleCancelRun(runId).catch(() => {});
  };
  const handleRequeueDeadLetter = (runId: string): void => {
    void orchestrator.handleRequeueDeadLetter(runId).catch(() => {});
  };
  const rawRunFilter = runHistoryState.runFilter as string;

  const runFilter: RunHistoryFilter = React.useMemo((): RunHistoryFilter => {
    if (rawRunFilter === 'active' || rawRunFilter === 'running' || rawRunFilter === 'queued') {
      return 'active';
    }
    if (rawRunFilter === 'failed') return 'failed';
    if (rawRunFilter === 'dead' || rawRunFilter === 'cancelled') return 'dead';
    return 'all';
  }, [rawRunFilter]);

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

  return (
    <div className='rounded-lg border border-border bg-card/60 p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <span className='text-sm font-semibold text-white'>Run History</span>
        <Button
          type='button'
          className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={handleRefresh}
          disabled={resolvedIsRefreshing}
        >
          {resolvedIsRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      <div className='mb-3 flex flex-wrap gap-2'>
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'failed', label: 'Failed' },
          { id: 'dead', label: 'Dead-letter' },
        ].map((filter: { id: string; label: string }): React.JSX.Element => (
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
        ))}
      </div>
      {filteredRunList.length === 0 ? (
        <div className='text-[11px] text-gray-500'>No runs yet.</div>
      ) : (
        <div className='space-y-2 text-xs text-gray-300'>
          {filteredRunList.slice(0, 6).map((run: AiPathRunRecord): React.JSX.Element => {
            const runHistory = (run.runtimeState?.history ?? undefined);
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
              : runHistoryOptions[0]?.id ?? null;
            const historyOpen = Boolean(expandedRunHistory[run.id]);
            const historyEntries =
              selectedHistoryNodeId && runHistory
                ? runHistory[selectedHistoryNodeId] ?? []
                : [];
            return (
              <div
                key={run.id}
                className='rounded-md border border-border/60 bg-card/70 p-2'
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <StatusBadge status={run.status} size='sm' className='font-bold' />
                    {isScheduledRun ? (
                      <div className='mt-1'>
                        <StatusBadge status='Scheduled' variant='warning' size='sm' className='font-bold' />
                      </div>
                    ) : null}
                    <div className='mt-1 text-[11px] text-gray-400'>
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                    {typeof run.retryCount === 'number' &&
                      typeof run.maxAttempts === 'number' && (
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
                  <div className='mt-2 rounded-md border border-border/70 bg-black/20 p-3'>
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
                            options={runHistoryOptions.map((option: { id: string; label: string }) => ({
                              value: option.id,
                              label: option.label
                            }))}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
