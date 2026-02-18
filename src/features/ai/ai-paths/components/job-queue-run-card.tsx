import React from 'react';

import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  RuntimeHistoryEntry,
} from '@/features/ai/ai-paths/lib';
import {
  Alert,
  Button,
  SelectSimple,
  StatusBadge,
  Textarea,
  FormField,
  CollapsibleSection,
  LoadingState,
  EmptyState,
} from '@/shared/ui';

import {
  formatDate,
  getExecutionLabel,
  getExecutionVariant,
  getOriginLabel,
  getOriginVariant,
  safePrettyJson,
  type RunDetail,
  type RunExecutionKind,
  type RunOrigin,
  type StreamConnectionStatus,
} from './job-queue-panel-utils';
import { RunningIndicator } from './job-queue-running-indicator';
import { RunHistoryEntries } from './RunHistoryEntries';

type HistoryOption = {
  id: string;
  label: string;
};

type JobQueueRunCardProps = {
  detailRun: AiPathRunRecord;
  detail: RunDetail | null;
  detailLoading: boolean;
  detailError: string | undefined;
  isExpanded: boolean;
  isRunning: boolean;
  isScheduledRun: boolean;
  streamStatus: StreamConnectionStatus;
  paused: boolean;
  canCancel: boolean;
  isCancellingThisRun: boolean;
  isDeletingThisRun: boolean;
  runOrigin: RunOrigin;
  runExecution: RunExecutionKind;
  runSource: string;
  runSourceDebug: string;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
  historyOptions: HistoryOption[];
  selectedHistoryNodeId: string | null;
  historyEntries: RuntimeHistoryEntry[];
  onToggleRun: () => void;
  onToggleStream: () => void;
  onRefreshDetail: () => void;
  onCancelRun: () => void;
  onDeleteRun: () => void;
  onSelectHistoryNode: (value: string) => void;
};

export function JobQueueRunCard({
  detailRun,
  detail,
  detailLoading,
  detailError,
  isExpanded,
  isRunning,
  isScheduledRun,
  streamStatus,
  paused,
  canCancel,
  isCancellingThisRun,
  isDeletingThisRun,
  runOrigin,
  runExecution,
  runSource,
  runSourceDebug,
  nodes,
  events,
  historyOptions,
  selectedHistoryNodeId,
  historyEntries,
  onToggleRun,
  onToggleStream,
  onRefreshDetail,
  onCancelRun,
  onDeleteRun,
  onSelectHistoryNode,
}: JobQueueRunCardProps): React.JSX.Element {
  return (
    <div className='rounded-md border border-border/60 bg-card/70 p-3 text-xs text-gray-300'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <StatusBadge status={detailRun.status} size='sm' className='font-bold' />
            {isRunning ? <RunningIndicator /> : null}
          </div>
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
          <div className='mt-1 flex flex-wrap items-center gap-1'>
            <StatusBadge
              status={'Origin: ' + getOriginLabel(runOrigin)}
              variant={getOriginVariant(runOrigin)}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={'Run: ' + getExecutionLabel(runExecution)}
              variant={getExecutionVariant(runExecution)}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={'Source: ' + runSource}
              variant='neutral'
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={'Debug: ' + runSourceDebug}
              variant='info'
              size='sm'
              title={runSourceDebug}
              className='font-medium'
            />
          </div>
          <div className='text-sm text-white'>{detailRun.pathName ?? 'AI Path'}</div>
          <div className='text-[11px] text-gray-400'>
            Run ID: <span className='font-mono'>{detailRun.id}</span>
          </div>
          <div className='text-[11px] text-gray-500'>
            Created {formatDate(detailRun.createdAt)}
          </div>
          <div className='text-[11px] text-gray-500'>
            Stream: {streamStatus}
          </div>
          {(detailRun.entityType || detailRun.entityId) && (
            <div className='text-[11px] text-gray-500'>
              Entity: {detailRun.entityType ?? '?'} {detailRun.entityId ?? ''}
            </div>
          )}
          {detailRun.errorMessage && (
            <Alert variant='error' className='mt-1 px-2 py-1 text-[11px]'>
              Error: {detailRun.errorMessage}
            </Alert>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onToggleRun}
          >
            {isExpanded ? 'Hide details' : 'Details'}
          </Button>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onToggleStream}
            disabled={!isExpanded}
          >
            {paused ? 'Resume stream' : 'Pause stream'}
          </Button>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onRefreshDetail}
            disabled={detailLoading}
          >
            {detailLoading ? 'Loading...' : 'Refresh detail'}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='rounded-md border px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/10'
            onClick={onCancelRun}
            disabled={!canCancel || isCancellingThisRun}
          >
            {isCancellingThisRun ? 'Canceling...' : 'Cancel'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={onDeleteRun}
            disabled={isDeletingThisRun}
          >
            {isDeletingThisRun ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className='mt-4 space-y-3'>
          {detailError ? (
            <div className='rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200'>
              {detailError}
            </div>
          ) : null}

          {!detail && !detailLoading ? (
            <LoadingState message='Loading run details...' size='sm' className='py-4' />
          ) : null}

          {detail ? (
            <>
              <div className='grid gap-3 text-[11px] text-gray-400 sm:grid-cols-2 lg:grid-cols-3'>
                <div>
                  <span className='uppercase text-gray-500'>Path ID</span>
                  <div className='text-white'>{detailRun.pathId ?? '-'}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Status</span>
                  <div className='text-white'>{detailRun.status}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Trigger</span>
                  <div className='text-white'>{detailRun.triggerEvent ?? '-'}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Origin</span>
                  <div className='text-white'>{getOriginLabel(runOrigin)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Run type</span>
                  <div className='text-white'>{getExecutionLabel(runExecution)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Source</span>
                  <div className='text-white'>{runSource}</div>
                </div>
                <div className='sm:col-span-2 lg:col-span-3'>
                  <span className='uppercase text-gray-500'>Source debug</span>
                  <div className='font-mono text-sky-200'>{runSourceDebug}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Started</span>
                  <div className='text-white'>{formatDate(detailRun.startedAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Finished</span>
                  <div className='text-white'>{formatDate(detailRun.finishedAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Dead-lettered</span>
                  <div className='text-white'>{formatDate(detailRun.deadLetteredAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Retry</span>
                  <div className='text-white'>
                    {detailRun.retryCount ?? 0}/{detailRun.maxAttempts ?? '-'}
                  </div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Next retry</span>
                  <div className='text-white'>{formatDate(detailRun.nextRetryAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Trigger node</span>
                  <div className='text-white'>{detailRun.triggerNodeId ?? '-'}</div>
                </div>
              </div>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Run history</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                {historyOptions.length > 1 ? (
                  <div className='mt-1 flex flex-wrap items-center gap-2'>
                    <FormField label='Node' className='flex-1'>
                      <SelectSimple
                        size='sm'
                        value={selectedHistoryNodeId || ''}
                        onValueChange={onSelectHistoryNode}
                        options={historyOptions.map((option: HistoryOption) => ({
                          value: option.id,
                          label: option.label,
                        }))}
                        placeholder='Select node'
                        triggerClassName='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'
                      />
                    </FormField>
                  </div>
                ) : (
                  <div className='mt-1 text-[11px] text-gray-500'>
                    {historyOptions[0]?.label ?? 'No history nodes'}
                  </div>
                )}
                <div className='mt-3'>
                  <RunHistoryEntries
                    entries={historyEntries}
                    emptyMessage='No history recorded for this run.'
                    showNodeLabel
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Nodes ({nodes.length})</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                {nodes.length === 0 ? (
                  <EmptyState
                    title='No nodes recorded'
                    description='No node execution details were captured for this run.'
                    variant='compact'
                    className='border-none bg-transparent py-4'
                  />
                ) : (
                  <div className='mt-1 space-y-2'>
                    {nodes.map((node: AiPathRunNodeRecord) => (
                      <CollapsibleSection
                        key={node.id}
                        title={(
                          <span className='text-[11px] text-gray-300'>
                            {node.nodeTitle ?? node.nodeId}{' '}
                            {node.nodeType ? `(${node.nodeType})` : ''}
                            <span className='ml-2 text-gray-500'>{node.status}</span>
                          </span>
                        )}
                        className='border-border/60 bg-black/30'
                        variant='subtle'
                      >
                        <div className='mt-1 grid gap-2 text-[11px] text-gray-400 sm:grid-cols-2 lg:grid-cols-3'>
                          <div>
                            <span className='uppercase text-gray-500'>Started</span>
                            <div className='text-white'>{formatDate(node.startedAt)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Finished</span>
                            <div className='text-white'>{formatDate(node.finishedAt)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Attempt</span>
                            <div className='text-white'>{node.attempt}</div>
                          </div>
                        </div>
                        {node.errorMessage ? (
                          <div className='mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200'>
                            Error: {node.errorMessage}
                          </div>
                        ) : null}
                        <div className='mt-3 grid gap-3 lg:grid-cols-2'>
                          <FormField label='Inputs'>
                            <Textarea
                              className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                              readOnly
                              value={safePrettyJson(node.inputs)}
                            />
                          </FormField>
                          <FormField label='Outputs'>
                            <Textarea
                              className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                              readOnly
                              value={safePrettyJson(node.outputs)}
                            />
                          </FormField>
                        </div>
                      </CollapsibleSection>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Events ({events.length})</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                {events.length === 0 ? (
                  <EmptyState
                    title='No events'
                    description='No runtime events were emitted during this execution.'
                    variant='compact'
                    className='border-none bg-transparent py-4'
                  />
                ) : (
                  <div className='mt-1 divide-y divide-border/70'>
                    {events.map((event: AiPathRunEventRecord) => (
                      <div key={event.id} className='py-2'>
                        <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-400'>
                          <span>{formatDate(event.createdAt)}</span>
                          <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-300'>
                            {event.level}
                          </span>
                        </div>
                        <div className='mt-1 text-sm text-white'>{event.message}</div>
                        {event.metadata ? (
                          <pre className='mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                            {safePrettyJson(event.metadata)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Runtime state</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <div className='mt-1 grid gap-3 lg:grid-cols-2'>
                  <FormField label='Inputs'>
                    <Textarea
                      className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(detailRun.runtimeState?.inputs)}
                    />
                  </FormField>
                  <FormField label='Outputs'>
                    <Textarea
                      className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(detailRun.runtimeState?.outputs)}
                    />
                  </FormField>
                </div>
                <div className='mt-3'>
                  <FormField label='Hashes'>
                    <Textarea
                      className='mt-1 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(detailRun.runtimeState?.hashes)}
                    />
                  </FormField>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Graph snapshot</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <Textarea
                  className='mt-1 min-h-[160px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                  readOnly
                  value={safePrettyJson(detailRun.graph)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Raw payloads</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <div className='mt-1 space-y-3'>
                  <FormField label='Run'>
                    <Textarea
                      className='mt-1 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(detailRun)}
                    />
                  </FormField>
                  <FormField label='Nodes'>
                    <Textarea
                      className='mt-1 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(nodes)}
                    />
                  </FormField>
                  <FormField label='Events'>
                    <Textarea
                      className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(events)}
                    />
                  </FormField>
                </div>
              </CollapsibleSection>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
