import React from 'react';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { formatDurationMs } from '@/shared/lib/ai-paths/format-duration';
import { Label, Card, CollapsibleSection } from '@/shared/ui/primitives.public';
import { StatusBadge, JsonViewer } from '@/shared/ui/data-display.public';
import { insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';
import {
  readRuntimeTraceSummary,
  type RunTracePayloadDiff,
  type RunTraceComparison,
  type RunTraceComparisonRow,
} from './run-trace-utils';
import { RunHistoryPillButton } from './RunHistoryPillButton';

interface RunComparisonToolProps {
  primaryRun: AiPathRunRecord;
  secondaryRun: AiPathRunRecord;
  traceComparison: RunTraceComparison | null;
  displayedComparisonRows: RunTraceComparisonRow[];
  compareInspectorRowKey: string | null;
  onSetCompareInspectorRowKey: (rowKey: string | null) => void;
}

type RunComparisonChipProps = {
  children: React.ReactNode;
  className?: string;
};

type RunComparisonStatLineProps = {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
};

type RunComparisonSummaryCardProps = {
  run: AiPathRunRecord;
  label: string;
};

type RunComparisonRowSummaryProps = {
  row: RunTraceComparisonRow;
  hasPayloadInspectorData: boolean;
  compareInspectorRowKey: string | null;
  onSetCompareInspectorRowKey: (rowKey: string | null) => void;
};

type RunComparisonInlineDiffSectionProps = {
  row: RunTraceComparisonRow;
};

type RunComparisonLabeledCodeBlockProps = {
  title: string;
  value: string;
  titleClassName?: string;
  blockClassName?: string;
};

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

const getComparisonClassificationVariant = (
  classification: RunTraceComparisonRow['classification']
): 'error' | 'success' | 'warning' | 'neutral' => {
  if (classification === 'regressed') return 'error';
  if (classification === 'improved') return 'success';
  if (classification === 'added' || classification === 'removed') return 'warning';
  return 'neutral';
};

const getPayloadDiffChangeCount = (diff: RunTracePayloadDiff): number =>
  diff.added.length + diff.removed.length + diff.changed.length;

const buildComparisonInspectorDescription = (row: RunTraceComparisonRow): string =>
  [
    `A span: ${row.leftHistorySpanId ?? 'not captured'}`,
    `B span: ${row.rightHistorySpanId ?? 'not captured'}`,
  ].join(' · ');

function RunComparisonChip({
  children,
  className,
}: RunComparisonChipProps): React.JSX.Element {
  return <span className={cn('rounded-full border px-2 py-px', className)}>{children}</span>;
}

function renderRunComparisonStatLine({
  label,
  value,
  valueClassName,
}: RunComparisonStatLineProps): React.JSX.Element {
  return (
    <div className='text-[10px] text-gray-400'>
      {label}: <span className={valueClassName}>{value}</span>
    </div>
  );
}

function renderRunComparisonSummaryCard({
  run,
  label,
}: RunComparisonSummaryCardProps): React.JSX.Element {
  const traceSummary = getRuntimeSummary(run);
  const fingerprint = getRuntimeFingerprint(run);
  const summaryRows: Array<{ label: string; value: React.ReactNode; valueClassName?: string }> = [
    {
      label: 'Created',
      value: run.createdAt ? new Date(run.createdAt).toLocaleString() : '–',
    },
    {
      label: 'Finished',
      value: run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '–',
    },
    {
      label: 'Runtime',
      value: formatDurationMs(traceSummary?.durationMs ?? null) ?? 'n/a',
    },
    {
      label: 'Iterations',
      value:
        typeof traceSummary?.iterationCount === 'number' ? traceSummary.iterationCount : 'n/a',
    },
    {
      label: 'Trace source',
      value: traceSummary?.source ?? 'n/a',
    },
    {
      label: 'Node spans',
      value: typeof traceSummary?.nodeSpanCount === 'number' ? traceSummary.nodeSpanCount : 'n/a',
    },
    {
      label: 'Seed reuses',
      value:
        typeof traceSummary?.seededSpanCount === 'number' ? traceSummary.seededSpanCount : 'n/a',
    },
    {
      label: 'Effect reuses',
      value:
        typeof traceSummary?.effectReplayCount === 'number' ? traceSummary.effectReplayCount : 'n/a',
    },
    {
      label: 'Retries',
      value:
        typeof run.retryCount === 'number' && typeof run.maxAttempts === 'number'
          ? `${run.retryCount}/${run.maxAttempts}`
          : 'n/a',
    },
    {
      label: 'Fingerprint',
      value: fingerprint ? fingerprint : 'n/a',
      valueClassName: 'font-mono',
    },
    {
      label: 'Slowest span',
      value: traceSummary?.slowestSpan
        ? `${traceSummary.slowestSpan.nodeId ?? 'n/a'} · ${formatDurationMs(
            traceSummary.slowestSpan.durationMs
          )}`
        : 'n/a',
    },
  ];

  return (
    <div className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} space-y-1`}>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-semibold text-white'>{label}</span>
        <RunComparisonChip className='border-border/70 text-[9px] uppercase text-gray-300'>
          {run.status}
        </RunComparisonChip>
      </div>
      {summaryRows.map((row) => (
        <React.Fragment key={`${run.id}-${row.label}`}>
          {renderRunComparisonStatLine({
            label: row.label,
            value: row.value,
            valueClassName: row.valueClassName,
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

function RunComparisonLabeledCodeBlock({
  title,
  value,
  titleClassName,
  blockClassName,
}: RunComparisonLabeledCodeBlockProps): React.JSX.Element {
  return (
    <div>
      <div className={cn('mb-1 text-[9px] uppercase text-gray-500', titleClassName)}>{title}</div>
      <pre
        className={cn(
          'overflow-auto whitespace-pre-wrap break-words rounded border border-border/40 bg-black/30 p-2 text-[10px] text-gray-200',
          blockClassName
        )}
      >
        {value}
      </pre>
    </div>
  );
}

const renderRunComparisonRowSummary = ({
  row,
  hasPayloadInspectorData,
  compareInspectorRowKey,
  onSetCompareInspectorRowKey,
}: RunComparisonRowSummaryProps): React.JSX.Element => {
  return (
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
            hist A: {row.leftHistorySpanId ?? '—'} · hist B: {row.rightHistorySpanId ?? '—'}
          </div>
        ) : null}
      </div>
      <div className='flex flex-wrap items-center gap-2 text-[10px] text-gray-300'>
        <StatusBadge
          status={row.classification}
          variant={getComparisonClassificationVariant(row.classification)}
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
        {row.inputDiff?.hasChanges ? (
          <RunComparisonChip className='border-sky-500/40 bg-sky-500/10 text-sky-100'>
            inputs {getPayloadDiffChangeCount(row.inputDiff)}
          </RunComparisonChip>
        ) : null}
        {row.outputDiff?.hasChanges ? (
          <RunComparisonChip className='border-emerald-500/40 bg-emerald-500/10 text-emerald-100'>
            outputs {getPayloadDiffChangeCount(row.outputDiff)}
          </RunComparisonChip>
        ) : null}
        {hasPayloadInspectorData ? (
          <RunHistoryPillButton
            variant='outline'
            baseClassName='h-6 px-2 text-[10px]'
            inactiveClassName=''
            onClick={(): void =>
              onSetCompareInspectorRowKey(compareInspectorRowKey === row.key ? null : row.key)
            }
          >
            {compareInspectorRowKey === row.key ? 'Hide payloads' : 'Inspect payloads'}
          </RunHistoryPillButton>
        ) : null}
      </div>
    </div>
  );
};

function renderRunComparisonInlineDiffSection({
  row,
}: RunComparisonInlineDiffSectionProps): React.JSX.Element | null {
  if (!row.inputDiff?.hasChanges && !row.outputDiff?.hasChanges) {
    return null;
  }

  return (
    <div className='mt-2 space-y-2 border-t border-border/40 pt-2 text-[10px] text-gray-300'>
      {row.inputDiff?.hasChanges ? (
        <RunComparisonLabeledCodeBlock
          title='Input diff'
          value={row.inputDiff.lines.join('\n')}
          titleClassName='uppercase text-sky-200'
          blockClassName='border-sky-500/30 text-sky-50'
        />
      ) : null}
      {row.outputDiff?.hasChanges ? (
        <RunComparisonLabeledCodeBlock
          title='Output diff'
          value={row.outputDiff.lines.join('\n')}
          titleClassName='uppercase text-emerald-200'
          blockClassName='border-emerald-500/30 text-emerald-50'
        />
      ) : null}
    </div>
  );
}

export function RunComparisonTool(props: RunComparisonToolProps): React.JSX.Element {
  const {
    primaryRun,
    secondaryRun,
    traceComparison,
    displayedComparisonRows,
    compareInspectorRowKey,
    onSetCompareInspectorRowKey,
  } = props;

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
          <RunComparisonChip className={labelClassName}>
            changed {diff?.changed.length ?? 0}
          </RunComparisonChip>
          <RunComparisonChip className='border-emerald-500/30 bg-emerald-500/10 text-emerald-100'>
            added {diff?.added.length ?? 0}
          </RunComparisonChip>
          <RunComparisonChip className='border-amber-500/30 bg-amber-500/10 text-amber-100'>
            removed {diff?.removed.length ?? 0}
          </RunComparisonChip>
          <RunComparisonChip className='border-border/50 bg-black/20 text-gray-300'>
            same {diff?.same.length ?? 0}
          </RunComparisonChip>
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
                  <RunComparisonLabeledCodeBlock title='Run A' value={entry.leftLabel ?? '—'} />
                  <RunComparisonLabeledCodeBlock title='Run B' value={entry.rightLabel ?? '—'} />
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
            const label = index === 0 ? 'Run A' : 'Run B';
            return (
              <React.Fragment key={run.id}>
                {renderRunComparisonSummaryCard({ run, label })}
              </React.Fragment>
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
            </div>
          </div>
          <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-gray-300'>
            <RunComparisonChip className='border-border/60 bg-black/20'>
              Duration delta (B-A): {formatDurationMs(traceComparison.durationDeltaMs)}
            </RunComparisonChip>
            <RunComparisonChip className='border-border/60 bg-black/20'>
              Iteration delta: {traceComparison.iterationDelta ?? 'n/a'}
            </RunComparisonChip>
            <RunComparisonChip className='border-border/60 bg-black/20'>
              Span delta: {traceComparison.spanDelta ?? 'n/a'}
            </RunComparisonChip>
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
                const inspectorDescription = buildComparisonInspectorDescription(row);

                return (
                  <div
                    key={row.key}
                    className='rounded-md border border-border/50 bg-black/20 px-3 py-2'
                  >
                    {renderRunComparisonRowSummary({
                      row,
                      hasPayloadInspectorData,
                      compareInspectorRowKey,
                      onSetCompareInspectorRowKey,
                    })}
                    {renderRunComparisonInlineDiffSection({ row })}
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
                            {[
                              {
                                title: 'Run A Inputs',
                                data: row.leftInputs,
                                emptyLabel: 'No captured input payload for Run A.',
                              },
                              {
                                title: 'Run B Inputs',
                                data: row.rightInputs,
                                emptyLabel: 'No captured input payload for Run B.',
                              },
                              {
                                title: 'Run A Outputs',
                                data: row.leftOutputs,
                                emptyLabel: 'No captured output payload for Run A.',
                              },
                              {
                                title: 'Run B Outputs',
                                data: row.rightOutputs,
                                emptyLabel: 'No captured output payload for Run B.',
                              },
                            ].map((pane) => (
                              <React.Fragment key={`${row.key}-${pane.title}`}>
                                {renderPayloadInspectorPane(pane.title, pane.data, pane.emptyLabel)}
                              </React.Fragment>
                            ))}
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
              No trace-level node deltas available for these runs yet.
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
