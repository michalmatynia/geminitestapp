import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { Label, Alert, Card } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';
import { buildHistoryNodeOptions } from './run-history-utils';
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
  onCancelRun: (id: string) => void;
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
    onCancelRun,
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
                      onClick={(): void => onSetPrimaryRunId(isPrimary ? null : run.id)}
                    >
                      {isPrimary ? 'Primary (A)' : 'Set A'}
                    </RunHistoryPillButton>
                    <RunHistoryPillButton
                      active={isSecondary}
                      variant='outline'
                      baseClassName='h-6 px-2'
                      activeClassName='border-amber-500/60 bg-amber-500/10 text-amber-100'
                      inactiveClassName='border-border text-gray-300 hover:bg-muted/60'
                      onClick={(): void => onSetSecondaryRunId(isSecondary ? null : run.id)}
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
                {(run.status === 'queued' || run.status === 'running') && (
                  <RunHistoryPillButton
                    onClick={(): void => onCancelRun(run.id)}
                    inactiveClassName='text-rose-200 hover:bg-rose-500/10'
                  >
                    Cancel
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
                        placeholder='Select node'
                        triggerClassName='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'
                        ariaLabel='Select node'
                        title='Select node'
                      />
                    ) : (
                      <span className='text-[11px] text-gray-500'>
                        {runHistoryOptions[0]?.label ?? 'No history nodes'}
                      </span>
                    )
                  ) : (
                    <span className='text-[11px] text-gray-500'>No history nodes</span>
                  )}
                </div>
                <div className='mt-2'>
                  <RunHistoryEntries
                    entries={historyEntries}
                    emptyMessage='No history recorded for this node.'
                    showNodeLabel
                  />
                </div>
              </Card>
            )}
          </Card>
        );
      })}
    </div>
  );
}
