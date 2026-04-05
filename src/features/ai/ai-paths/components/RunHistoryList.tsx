import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiPathRunRecord, RuntimeHistoryEntry } from '@/shared/lib/ai-paths';
import { Label, Alert, Card } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';
import { buildHistoryNodeOptions } from './run-history-utils';
import { resolveRunHistoryEntryAction } from './run-history-entry-actions';
import { RunHistoryEntries } from './RunHistoryEntries';
import { RunHistoryPillButton } from './RunHistoryPillButton';

interface RunHistoryListProps {
  runs: AiPathRunRecord[];
  emptyFilterLabel?: string;
  compareMode: boolean;
  primaryRunId: string | null;
  secondaryRunId: string | null;
  onSetPrimaryRunId: (id: string | null) => void;
  onSetSecondaryRunId: (id: string | null) => void;
  onOpenRunDetail: (id: string) => void;
  onExpandedRunHistory: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedRunHistory: Record<string, boolean>;
  runHistorySelection: Record<string, string>;
  onSetRunHistorySelection: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onResumeRun: (id: string, mode: 'resume' | 'replay') => void;
  onHandoffRun: (id: string) => void;
  handoffStateByRunId: Record<string, 'pending' | 'success'>;
  onCancelRun: (id: string) => void;
  onRequeueDeadLetter: (id: string) => void;
  onRetryRunNode: (id: string, nodeId: string) => void;
}

export function RunHistoryList(props: RunHistoryListProps): React.JSX.Element {
  const {
    runs,
    emptyFilterLabel = 'No runs yet',
    compareMode,
    primaryRunId,
    secondaryRunId,
    onSetPrimaryRunId,
    onSetSecondaryRunId,
    onOpenRunDetail,
    onExpandedRunHistory,
    expandedRunHistory,
    runHistorySelection,
    onSetRunHistorySelection,
    onResumeRun,
    onHandoffRun,
    handoffStateByRunId,
    onCancelRun,
    onRequeueDeadLetter,
    onRetryRunNode,
  } = props;
  if (runs.length === 0) {
    return (
      <CompactEmptyState
        title='No runs found'
        description={emptyFilterLabel}
        className='py-8'
      />
    );
  }

  return (
    <div className='space-y-2 text-xs text-gray-300'>
      {runs.slice(0, 6).map((run: AiPathRunRecord): React.JSX.Element => {
        const runHistory = (
          run.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | undefined
        )?.history;
        const runHistoryOptions = buildHistoryNodeOptions(
          runHistory,
          null,
          run.graph?.nodes ?? null
        );
        const runHistorySelectOptions: Array<LabeledOptionDto<string>> = runHistoryOptions.map(
          (option: { id: string; label: string }) => ({
            value: option.id,
            label: option.label,
          })
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
                    <RunHistoryPillButton
                      active={isPrimary}
                      variant='outline'
                      baseClassName='h-6 px-2'
                      activeClassName='border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                      inactiveClassName='border-border text-gray-300 hover:bg-muted/60'
                      onClick={(): void =>
                        onSetPrimaryRunId(isPrimary ? null : run.id)
                      }
                    >
                      {isPrimary ? 'Primary (A)' : 'Set A'}
                    </RunHistoryPillButton>
                    <RunHistoryPillButton
                      active={isSecondary}
                      variant='outline'
                      baseClassName='h-6 px-2'
                      activeClassName='border-amber-500/60 bg-amber-500/10 text-amber-100'
                      inactiveClassName='border-border text-gray-300 hover:bg-muted/60'
                      onClick={(): void =>
                        onSetSecondaryRunId(isSecondary ? null : run.id)
                      }
                      disabled={isPrimary}
                    >
                      {isSecondary ? 'Secondary (B)' : 'Set B'}
                    </RunHistoryPillButton>
                  </div>
                )}
                <RunHistoryPillButton
                  onClick={(): void => onOpenRunDetail(run.id)}
                  inactiveClassName='text-gray-200 hover:bg-muted/60'
                >
                  Details
                </RunHistoryPillButton>
                <RunHistoryPillButton
                  onClick={(): void => {
                    onExpandedRunHistory((prev: Record<string, boolean>) => ({
                      ...prev,
                      [run.id]: !prev[run.id],
                    }));
                    if (!runHistorySelection[run.id] && runHistoryOptions[0]?.id) {
                      onSetRunHistorySelection((prev: Record<string, string>) => ({
                        ...prev,
                        [run.id]: runHistoryOptions[0]?.id ?? '',
                      }));
                    }
                  }}
                  inactiveClassName='text-gray-200 hover:bg-muted/60'
                >
                  {historyOpen ? 'Hide history' : 'History'}
                </RunHistoryPillButton>
                {(run.status === 'failed' ||
                  run.status === 'paused' ||
                  run.status === 'handoff_ready') && (
                  <RunHistoryPillButton
                    onClick={(): void => onResumeRun(run.id, 'resume')}
                    inactiveClassName='text-amber-200 hover:bg-amber-500/10'
                  >
                    Resume
                  </RunHistoryPillButton>
                )}
                <RunHistoryPillButton
                  onClick={(): void => onResumeRun(run.id, 'replay')}
                  inactiveClassName='text-sky-200 hover:bg-sky-500/10'
                >
                  Replay
                </RunHistoryPillButton>
                {run.status === 'blocked_on_lease' && (
                  <>
                    <RunHistoryPillButton
                      onClick={(): void => onHandoffRun(run.id)}
                      disabled={handoffStateByRunId[run.id] === 'pending'}
                      inactiveClassName='text-blue-200 hover:bg-blue-500/10'
                    >
                      {handoffStateByRunId[run.id] === 'pending'
                        ? 'Marking...'
                        : 'Mark handoff-ready'}
                    </RunHistoryPillButton>
                    {handoffStateByRunId[run.id] === 'success' ? (
                      <span className='text-[10px] text-blue-200'>
                        Handoff requested. Refreshing status...
                      </span>
                    ) : null}
                  </>
                )}
                {(run.status === 'queued' ||
                  run.status === 'running' ||
                  run.status === 'blocked_on_lease') && (
                  <RunHistoryPillButton
                    onClick={(): void => onCancelRun(run.id)}
                    inactiveClassName='text-rose-200 hover:bg-rose-500/10'
                  >
                    Cancel
                  </RunHistoryPillButton>
                )}
                {run.status === 'dead_lettered' && (
                  <RunHistoryPillButton
                    onClick={(): void => onRequeueDeadLetter(run.id)}
                    inactiveClassName='text-amber-200 hover:bg-amber-500/10'
                  >
                    Requeue
                  </RunHistoryPillButton>
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
                          onSetRunHistorySelection((prev: Record<string, string>) => ({
                            ...prev,
                            [run.id]: value,
                          }))
                        }
                        options={runHistorySelectOptions}
                        triggerClassName='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'
                        placeholder='Select node'
                        ariaLabel='Select node'
                        title='Select node'
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
                      onReplayFromEntry={(entry): void => {
                        const action = resolveRunHistoryEntryAction(entry);
                        if (action.kind === 'retry_node') {
                          onRetryRunNode(run.id, entry.nodeId);
                          return;
                        }
                        onResumeRun(run.id, action.resumeMode ?? 'replay');
                      }}
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
  );
}
