import React from 'react';
import type { AiPathRunRecord } from '@/shared/lib/ai-paths';
import { formatDurationMs } from '@/shared/lib/ai-paths';
import {
  Button,
  Label,
  StatusBadge,
  Card,
  JsonViewer,
  CollapsibleSection,
} from '@/shared/ui';
import {
  readRuntimeTraceSummary,
  type RunTracePayloadDiff,
  type RunTraceComparison,
  type RunTraceComparisonRow,
} from './run-trace-utils';

interface RunComparisonToolProps {
  primaryRun: AiPathRunRecord;
  secondaryRun: AiPathRunRecord;
  traceComparison: RunTraceComparison | null;
  displayedComparisonRows: RunTraceComparisonRow[];
  compareResumeChangesOnly: boolean;
  onToggleResumeChangesOnly: () => void;
  compareInspectorRowKey: string | null;
  onSetCompareInspectorRowKey: (rowKey: string | null) => void;
}

export function RunComparisonTool(props: RunComparisonToolProps): React.JSX.Element {
  const {
    primaryRun,
    secondaryRun,
    traceComparison,
    displayedComparisonRows,
    compareResumeChangesOnly,
    onToggleResumeChangesOnly,
    compareInspectorRowKey,
    onSetCompareInspectorRowKey,
  } = props;

  const getRuntimeSummary = (run: AiPathRunRecord | null) => {
    return readRuntimeTraceSummary(run?.meta ?? null);
  };

  const getRuntimeFingerprint = (run: AiPathRunRecord | null): string | null => {
    if (!run?.meta || typeof run.meta !== 'object') return null;
    const raw = run.meta['runtimeFingerprint'];
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const formatResumeComparisonLabel = (
    mode: string | null,
    decision: string | null
  ): string => {
    const parts: string[] = [];
    if (mode) parts.push(mode);
    if (decision) parts.push(decision);
    return parts.join('/') || 'none';
  };

  const renderPayloadInspectorPane = (
    title: string,
    data: unknown,
    emptyLabel: string
  ): React.JSX.Element => {
    if (data === null || data === undefined) {
      return (
        <div className='rounded-lg border border-dashed border-border/60 bg-card/20 p-3 text-[11px] text-gray-400'>
          {emptyLabel}
        </div>
      );
    }

    return <JsonViewer title={title} data={data} maxHeight='220px' className='bg-card/20' />;
  };

  const renderPayloadDiffInspector = (
    title: string,
    diff: RunTracePayloadDiff | null,
    tone: 'input' | 'output'
  ): React.JSX.Element => {
    const changedEntries = diff?.entries.filter((entry) => entry.change !== 'same') ?? [];
    const accentClassName =
      tone === 'input'
        ? 'border-sky-500/30 bg-sky-500/5 text-sky-100'
        : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100';
    const labelClassName =
      tone === 'input'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';

    return (
      <div className={`rounded-lg border p-3 ${accentClassName}`}>
        <div className='mb-3 flex flex-wrap items-center gap-2 text-[10px]'>
          <span className='font-semibold uppercase tracking-wide'>{title}</span>
          <span className={labelClassName + ' rounded-full px-2 py-px'}>
            changed {diff?.changed.length ?? 0}
          </span>
          <span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-px text-emerald-100'>
            added {diff?.added.length ?? 0}
          </span>
          <span className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-px text-amber-100'>
            removed {diff?.removed.length ?? 0}
          </span>
          <span className='rounded-full border border-border/50 bg-black/20 px-2 py-px text-gray-300'>
            same {diff?.same.length ?? 0}
          </span>
        </div>
        {changedEntries.length > 0 ? (
          <div className='space-y-2'>
            {changedEntries.slice(0, 8).map((entry) => {
              const changeBadgeClassName =
                entry.change === 'added'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                  : entry.change === 'removed'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : 'border-sky-500/30 bg-sky-500/10 text-sky-100';
              return (
                <div
                  key={`${title}-${entry.change}-${entry.key}`}
                  className='grid gap-2 rounded-md border border-border/40 bg-black/20 p-2 lg:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)]'
                >
                  <div className='space-y-1'>
                    <span
                      className={`inline-flex rounded-full border px-2 py-px text-[9px] font-semibold uppercase tracking-wide ${changeBadgeClassName}`}
                    >
                      {entry.change}
                    </span>
                    <div className='font-mono text-[10px] text-gray-200'>{entry.key}</div>
                  </div>
                  <div>
                    <div className='mb-1 text-[9px] uppercase text-gray-500'>Run A</div>
                    <pre className='overflow-auto whitespace-pre-wrap break-words rounded border border-border/40 bg-black/30 p-2 text-[10px] text-gray-200'>
                      {entry.leftLabel ?? '—'}
                    </pre>
                  </div>
                  <div>
                    <div className='mb-1 text-[9px] uppercase text-gray-500'>Run B</div>
                    <pre className='overflow-auto whitespace-pre-wrap break-words rounded border border-border/40 bg-black/30 p-2 text-[10px] text-gray-200'>
                      {entry.rightLabel ?? '—'}
                    </pre>
                  </div>
                </div>
              );
            })}
            {changedEntries.length > 8 ? (
              <div className='text-[10px] text-gray-400'>
                Showing first 8 changed fields. Use the raw JSON panes below for the full payload.
              </div>
            ) : null}
          </div>
        ) : (
          <div className='text-[11px] text-gray-400'>
            No field-level differences in this payload.
          </div>
        )}
      </div>
    );
  };

  return (
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
            const traceSummary = getRuntimeSummary(run);
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
                  Runtime: {formatDurationMs(traceSummary?.durationMs ?? null) ?? 'n/a'}
                </div>
                <div className='text-[10px] text-gray-400'>
                  Iterations:{' '}
                  {typeof traceSummary?.iterationCount === 'number'
                    ? traceSummary.iterationCount
                    : 'n/a'}
                </div>
                <div className='text-[10px] text-gray-400'>
                  Trace source: {traceSummary?.source ?? 'n/a'}
                </div>
                <div className='text-[10px] text-gray-400'>
                  Node spans:{' '}
                  {typeof traceSummary?.nodeSpanCount === 'number'
                    ? traceSummary.nodeSpanCount
                    : 'n/a'}
                </div>
                <div className='text-[10px] text-gray-400'>
                  Seed reuses:{' '}
                  {typeof traceSummary?.seededSpanCount === 'number'
                    ? traceSummary.seededSpanCount
                    : 'n/a'}
                </div>
                <div className='text-[10px] text-gray-400'>
                  Effect reuses:{' '}
                  {typeof traceSummary?.effectReplayCount === 'number'
                    ? traceSummary.effectReplayCount
                    : 'n/a'}
                </div>
                <div className='text-[10px] text-gray-400'>
                  Resume reuses:{' '}
                  {typeof traceSummary?.resumeReuseCount === 'number'
                    ? traceSummary.resumeReuseCount
                    : 'n/a'}
                </div>
                <div className='text-[10px] text-gray-400'>
                  Resume re-execs:{' '}
                  {typeof traceSummary?.resumeReexecutionCount === 'number'
                    ? traceSummary.resumeReexecutionCount
                    : 'n/a'}
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
                <div className='text-[10px] text-gray-400'>
                  Slowest span:{' '}
                  {traceSummary?.slowestSpan
                    ? `${traceSummary.slowestSpan.nodeId ?? 'n/a'} · ${formatDurationMs(
                      traceSummary.slowestSpan.durationMs
                    )}`
                    : 'n/a'}
                </div>
              </div>
            );
          }
        )}
      </div>
      {traceComparison ? (
        <div className='mt-3 rounded-md border border-border/60 bg-card/30 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <span className='text-[10px] uppercase text-gray-500'>
              Trace diff ({traceComparison.dataSource})
            </span>
            <div className='flex flex-wrap items-center gap-2 text-[10px] text-gray-400'>
              <span>Regressions: {traceComparison.regressedCount}</span>
              <span>Improvements: {traceComparison.improvedCount}</span>
              <span>Added: {traceComparison.addedCount}</span>
              <span>Removed: {traceComparison.removedCount}</span>
              <span>Payload changes: {traceComparison.payloadChangedCount}</span>
              <Button
                type='button'
                size='xs'
                variant='outline'
                className={`h-6 px-2 text-[10px] ${
                  compareResumeChangesOnly
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-100'
                    : ''
                }`}
                disabled={
                  traceComparison.resumeModeChangeCount === 0 &&
                  traceComparison.resumeDecisionChangeCount === 0
                }
                onClick={onToggleResumeChangesOnly}
              >
                {compareResumeChangesOnly ? 'Show all rows' : 'Resume changes only'}
              </Button>
            </div>
          </div>
          <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-gray-300'>
            <span className='rounded-full border border-border/60 bg-black/20 px-2 py-px'>
              Duration delta (B-A): {formatDurationMs(traceComparison.durationDeltaMs)}
            </span>
            <span className='rounded-full border border-border/60 bg-black/20 px-2 py-px'>
              Iteration delta: {traceComparison.iterationDelta ?? 'n/a'}
            </span>
            <span className='rounded-full border border-border/60 bg-black/20 px-2 py-px'>
              Span delta: {traceComparison.spanDelta ?? 'n/a'}
            </span>
          </div>
          <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-gray-300'>
            <span className='rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-px text-sky-100'>
              Resume mode changes: {traceComparison.resumeModeChangeCount}
            </span>
            <span className='rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-px text-sky-100'>
              Resume decision changes: {traceComparison.resumeDecisionChangeCount}
            </span>
            <span className='rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-px text-sky-100'>
              Resumed nodes Δ (B-A): {traceComparison.resumedNodeDelta ?? 'n/a'}
            </span>
            <span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-px text-emerald-100'>
              Reused Δ (B-A): {traceComparison.reusedNodeDelta ?? 'n/a'}
            </span>
            <span className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-px text-amber-100'>
              Re-exec Δ (B-A): {traceComparison.reexecutedNodeDelta ?? 'n/a'}
            </span>
          </div>
          <div className='mt-2 text-[10px] text-gray-500'>
            Rows with replay or resume behavior changes are listed first within each diff class.
          </div>
          <div className='mt-1 text-[10px] text-gray-500'>
            Showing {displayedComparisonRows.length} of {traceComparison.rows.length} rows.
          </div>
          {displayedComparisonRows.length > 0 ? (
            <div className='mt-3 space-y-2'>
              {displayedComparisonRows.slice(0, 6).map((row) => {
                const hasPayloadInspectorData = [
                  row.leftInputs,
                  row.rightInputs,
                  row.leftOutputs,
                  row.rightOutputs,
                ].some((value) => value !== null && value !== undefined);
                const inspectorDescription = [
                  `A span: ${row.leftHistorySpanId ?? 'not captured'}`,
                  `B span: ${row.rightHistorySpanId ?? 'not captured'}`,
                ].join(' · ');

                return (
                  <div
                    key={row.key}
                    className='rounded-md border border-border/50 bg-black/20 px-3 py-2'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='min-w-[180px] flex-1'>
                        <div className='text-[11px] text-white'>
                          {row.nodeTitle ?? row.nodeId}
                          {row.nodeType ? ` (${row.nodeType})` : ''}
                        </div>
                        <div className='text-[10px] text-gray-500'>
                          A: {row.leftStatus ?? '—'} · B: {row.rightStatus ?? '—'}
                        </div>
                        {row.leftHistorySpanId || row.rightHistorySpanId ? (
                          <div className='text-[10px] text-gray-500'>
                            hist A: {row.leftHistorySpanId ?? '—'} · hist B:{' '}
                            {row.rightHistorySpanId ?? '—'}
                          </div>
                        ) : null}
                      </div>
                      <div className='flex flex-wrap items-center gap-2 text-[10px] text-gray-300'>
                        <StatusBadge
                          status={row.classification}
                          variant={
                            row.classification === 'regressed'
                              ? 'error'
                              : row.classification === 'improved'
                                ? 'success'
                                : row.classification === 'added' ||
                                    row.classification === 'removed'
                                  ? 'warning'
                                  : 'neutral'
                          }
                          size='sm'
                          className='font-bold'
                        />
                        <span>A {formatDurationMs(row.leftTotalMs)}</span>
                        <span>B {formatDurationMs(row.rightTotalMs)}</span>
                        <span>Δ {formatDurationMs(row.deltaMs)}</span>
                        <span>
                          spans {row.leftSpanCount}
                          {'->'}
                          {row.rightSpanCount}
                        </span>
                        {row.leftResumeDecision !== row.rightResumeDecision ||
                        row.leftResumeMode !== row.rightResumeMode ? (
                            <span className='rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-px text-sky-100'>
                            resume{' '}
                              {formatResumeComparisonLabel(
                                row.leftResumeMode,
                                row.leftResumeDecision
                              )}
                              {' -> '}
                              {formatResumeComparisonLabel(
                                row.rightResumeMode,
                                row.rightResumeDecision
                              )}
                            </span>
                          ) : null}
                        {row.inputDiff?.hasChanges ? (
                          <span className='rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-px text-sky-100'>
                            inputs{' '}
                            {row.inputDiff.added.length +
                              row.inputDiff.removed.length +
                              row.inputDiff.changed.length}
                          </span>
                        ) : null}
                        {row.outputDiff?.hasChanges ? (
                          <span className='rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-px text-emerald-100'>
                            outputs{' '}
                            {row.outputDiff.added.length +
                              row.outputDiff.removed.length +
                              row.outputDiff.changed.length}
                          </span>
                        ) : null}
                        {hasPayloadInspectorData ? (
                          <Button
                            type='button'
                            size='xs'
                            variant='outline'
                            className='h-6 px-2 text-[10px]'
                            onClick={(): void =>
                              onSetCompareInspectorRowKey(
                                compareInspectorRowKey === row.key ? null : row.key
                              )
                            }
                          >
                            {compareInspectorRowKey === row.key
                              ? 'Hide payloads'
                              : 'Inspect payloads'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {row.inputDiff?.hasChanges || row.outputDiff?.hasChanges ? (
                      <div className='mt-2 space-y-2 border-t border-border/40 pt-2 text-[10px] text-gray-300'>
                        {row.inputDiff?.hasChanges ? (
                          <div>
                            <div className='mb-1 uppercase text-sky-200'>Input diff</div>
                            <pre className='overflow-auto rounded border border-sky-500/30 bg-black/30 p-2 text-[10px] text-sky-50'>
                              {row.inputDiff.lines.join('\n')}
                            </pre>
                          </div>
                        ) : null}
                        {row.outputDiff?.hasChanges ? (
                          <div>
                            <div className='mb-1 uppercase text-emerald-200'>Output diff</div>
                            <pre className='overflow-auto rounded border border-emerald-500/30 bg-black/30 p-2 text-[10px] text-emerald-50'>
                              {row.outputDiff.lines.join('\n')}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {compareInspectorRowKey === row.key ? (
                      <CollapsibleSection
                        title='Payload Inspector'
                        description={inspectorDescription}
                        open
                        variant='subtle'
                        className='mt-3'
                        triggerClassName='px-0 py-2 hover:bg-transparent'
                        contentClassName='px-0'
                      >
                        <div className='space-y-3'>
                          <div className='grid gap-3 lg:grid-cols-2'>
                            {renderPayloadDiffInspector(
                              'Input field diff',
                              row.inputDiff,
                              'input'
                            )}
                            {renderPayloadDiffInspector(
                              'Output field diff',
                              row.outputDiff,
                              'output'
                            )}
                          </div>
                          <div className='grid gap-3 lg:grid-cols-2'>
                            {renderPayloadInspectorPane(
                              'Run A Inputs',
                              row.leftInputs,
                              'No captured input payload for Run A.'
                            )}
                            {renderPayloadInspectorPane(
                              'Run B Inputs',
                              row.rightInputs,
                              'No captured input payload for Run B.'
                            )}
                            {renderPayloadInspectorPane(
                              'Run A Outputs',
                              row.leftOutputs,
                              'No captured output payload for Run A.'
                            )}
                            {renderPayloadInspectorPane(
                              'Run B Outputs',
                              row.rightOutputs,
                              'No captured output payload for Run B.'
                            )}
                          </div>
                        </div>
                      </CollapsibleSection>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='mt-2 text-[10px] text-gray-500'>
              {compareResumeChangesOnly
                ? 'No rows with replay or resume behavior changes.'
                : 'No trace-level node deltas available for these runs yet.'}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
