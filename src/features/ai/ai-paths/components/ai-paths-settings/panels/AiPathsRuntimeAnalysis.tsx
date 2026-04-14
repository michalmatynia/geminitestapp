'use client';

import React, { useMemo, useCallback } from 'react';

import {
  useGraphDataState,
  usePathMetadataState,
  useRunHistoryActions,
  useRuntimeStatusState,
} from '@/features/ai/ai-paths/context';
import type {
  AiPathRuntimeTraceSlowNode,
  AiPathRuntimeTraceFailedNode,
} from '@/shared/contracts/ai-paths';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import type { AiNode } from '@/shared/contracts/ai-paths';
import { listAiPathRuns } from '@/shared/lib/ai-paths/api';
import { useAiPathRuntimeAnalytics } from '@/shared/lib/ai-paths/hooks/useAiPathQueries';
import {
  buildVisionModelCapabilityErrorMessage,
  collectVisionModelCapabilityIssues,
} from '@/shared/lib/ai-paths/core/utils/model-capability-preflight';
import { Button, Card, useToast } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  formatDurationMs,
  formatPercent,
  formatStatusLabel,
  statusToVariant,
} from '../ai-paths-settings-view-utils';
import { useAiPathsErrorState } from '../hooks/useAiPathsErrorState';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type RuntimeAnalysisCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
};

type RuntimeAnalysisStatLineProps = {
  children: React.ReactNode;
  className?: string;
};

type RuntimeAnalysisTraceActionChipProps = {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone: 'sky' | 'rose';
};

function renderRuntimeAnalysisCard({
  title,
  children,
  className,
  titleClassName,
}: RuntimeAnalysisCardProps): React.JSX.Element {
  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className={cn('border-border/60 bg-card/60', className)}
    >
      <div className={cn('text-[10px] uppercase text-gray-500', titleClassName)}>{title}</div>
      {children}
    </Card>
  );
}

function RuntimeAnalysisStatLine({
  children,
  className,
}: RuntimeAnalysisStatLineProps): React.JSX.Element {
  return <div className={cn('mt-1 text-gray-400', className)}>{children}</div>;
}

function RuntimeAnalysisTraceActionChip({
  children,
  onClick,
  title,
  tone,
}: RuntimeAnalysisTraceActionChipProps): React.JSX.Element {
  const toneClassName =
    tone === 'sky'
      ? 'border-sky-500/40 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20'
      : 'border-rose-500/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20';

  return (
    <button
      type='button'
      className={cn(
        'rounded border px-1.5 py-0.5 text-[10px]',
        toneClassName
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export function AiPathsRuntimeAnalysis(): React.JSX.Element | null {
  const { runtimeRunStatus, runtimeNodeStatuses } = useRuntimeStatusState();
  const { nodes } = useGraphDataState();
  const { activePathId } = usePathMetadataState();
  const { setRunHistoryNodeId, setRunFilter, openRunDetail } = useRunHistoryActions();
  const { toast } = useToast();
  const { reportAiPathsError } = useAiPathsErrorState({ toast });
  const runtimeAnalyticsCapability = useBrainAssignment({
    capability: 'insights.runtime_analytics',
  });
  const brainModelOptions = useBrainModelOptions({
    capability: 'ai_paths.model',
  });
  const runtimeAnalyticsEnabled =
    runtimeAnalyticsCapability.assignment.enabled && brainModelOptions.assignment.enabled;

  const runtimeAnalyticsQuery = useAiPathRuntimeAnalytics('24h', runtimeAnalyticsEnabled);
  const portableEngineAnalytics = runtimeAnalyticsQuery.data?.portableEngine;
  const latestPortableEngineFailure = portableEngineAnalytics?.recentFailures[0] ?? null;
  const runtimeKernelParity = runtimeAnalyticsQuery.data?.traces.kernelParity;
  const runtimeKernelSampledRuns = runtimeKernelParity?.sampledRuns ?? 0;
  const runtimeKernelRunsWithParity = runtimeKernelParity?.runsWithKernelParity ?? 0;
  const runtimeKernelSampledHistoryEntries = runtimeKernelParity?.sampledHistoryEntries ?? 0;
  const runtimeKernelV3Entries = runtimeKernelParity?.strategyCounts.code_object_v3 ?? 0;
  const runtimeKernelCompatibilityEntries = runtimeKernelParity?.strategyCounts.compatibility ?? 0;
  const runtimeKernelUnknownEntries = runtimeKernelParity?.strategyCounts.unknown ?? 0;
  const runtimeKernelResolutionOverride = runtimeKernelParity?.resolutionSourceCounts.override ?? 0;
  const runtimeKernelResolutionRegistry = runtimeKernelParity?.resolutionSourceCounts.registry ?? 0;
  const runtimeKernelResolutionMissing = runtimeKernelParity?.resolutionSourceCounts.missing ?? 0;
  const runtimeKernelResolutionUnknown = runtimeKernelParity?.resolutionSourceCounts.unknown ?? 0;
  const runtimeKernelCodeObjectIds = runtimeKernelParity?.codeObjectIds ?? [];

  const runtimeKernelRunsCoverageRate =
    runtimeKernelSampledRuns > 0
      ? (runtimeKernelRunsWithParity / runtimeKernelSampledRuns) * 100
      : 0;
  const runtimeKernelV3Rate =
    runtimeKernelSampledHistoryEntries > 0
      ? (runtimeKernelV3Entries / runtimeKernelSampledHistoryEntries) * 100
      : 0;
  const runtimeKernelCompatibilityRate =
    runtimeKernelSampledHistoryEntries > 0
      ? (runtimeKernelCompatibilityEntries / runtimeKernelSampledHistoryEntries) * 100
      : 0;
  const runtimeKernelUnknownRate =
    runtimeKernelSampledHistoryEntries > 0
      ? (runtimeKernelUnknownEntries / runtimeKernelSampledHistoryEntries) * 100
      : 0;

  const nodeTitleById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    nodes.forEach((node: AiNode) => {
      map.set(node.id, node.title ?? node.id);
    });
    return map;
  }, [nodes]);

  const visionModelCapabilityIssues = useMemo(
    () =>
      collectVisionModelCapabilityIssues({
        nodes,
        defaultModelId: brainModelOptions.effectiveModelId,
        descriptors: brainModelOptions.descriptors,
      }),
    [brainModelOptions.descriptors, brainModelOptions.effectiveModelId, nodes]
  );

  const runtimeNodeStatusEntries = useMemo(
    (): Array<[string, string]> =>
      Object.entries(runtimeNodeStatuses ?? {}).filter(
        (entry: [string, unknown]): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[1].trim().length > 0
      ),
    [runtimeNodeStatuses]
  );

  const runtimeNodeStatusCounts = useMemo((): Record<string, number> => {
    return runtimeNodeStatusEntries.reduce<Record<string, number>>(
      (acc: Record<string, number>, [, status]: [string, string]) => {
        const normalized = status.trim().toLowerCase();
        acc[normalized] = (acc[normalized] ?? 0) + 1;
        return acc;
      },
      {}
    );
  }, [runtimeNodeStatusEntries]);

  const runtimeNodeLiveStates = useMemo(
    (): Array<{ nodeId: string; title: string; status: string }> =>
      runtimeNodeStatusEntries
        .map(([nodeId, status]: [string, string]) => ({
          nodeId,
          title: nodeTitleById.get(nodeId) ?? nodeId,
          status: status.trim().toLowerCase(),
        }))
        .filter(
          (entry: { nodeId: string; title: string; status: string }) =>
            entry.status === 'running' ||
            entry.status === 'queued' ||
            entry.status === 'polling' ||
            entry.status === 'paused' ||
            entry.status === 'waiting_callback'
        )
        .slice(0, 8),
    [nodeTitleById, runtimeNodeStatusEntries]
  );

  const fetchLatestRunIdForTraceNode = useCallback(
    async (nodeId: string, preferFailed: boolean): Promise<string | null> => {
      const baseOptions = {
        ...(activePathId ? { pathId: activePathId } : {}),
        nodeId,
        limit: 1,
        offset: 0,
      };
      const readFirstRunId = (payload: {
        ok: boolean;
        data?: { runs: unknown[] };
      }): string | null => {
        if (!payload.ok || !payload.data || !Array.isArray(payload.data.runs)) return null;
        const firstRun = payload.data.runs[0] as Record<string, unknown> | undefined;
        const firstRunId = firstRun?.['id'];
        return typeof firstRunId === 'string' && firstRunId.trim().length > 0
          ? firstRunId.trim()
          : null;
      };

      if (preferFailed) {
        const failedResult = await listAiPathRuns({
          ...baseOptions,
          status: 'failed',
        });
        const failedRunId = readFirstRunId(failedResult);
        if (failedRunId) return failedRunId;
      }

      const fallbackResult = await listAiPathRuns(baseOptions);
      return readFirstRunId(fallbackResult);
    },
    [activePathId]
  );

  const handleInspectTraceNode = useCallback(
    async (nodeId: string, focus: 'all' | 'failed'): Promise<void> => {
      const targetNodeId = nodeId.trim();
      if (!targetNodeId) return;
      try {
        const runId = await fetchLatestRunIdForTraceNode(targetNodeId, focus === 'failed');
        if (!runId) {
          toast(`No recent runs found for ${targetNodeId}.`, { variant: 'warning' });
          return;
        }
        setRunHistoryNodeId(targetNodeId);
        setRunFilter(focus);
        openRunDetail(runId);
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(
          error,
          {
            action: 'inspectRuntimeTraceNode',
            nodeId: targetNodeId,
            focus,
          },
          'Failed to inspect runtime trace node:'
        );
        toast('Failed to open run details for trace node.', { variant: 'error' });
      }
    },
    [fetchLatestRunIdForTraceNode, openRunDetail, reportAiPathsError, setRunFilter, setRunHistoryNodeId, toast]
  );

  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-border/60 bg-card/50'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>Runtime Analysis</div>
          <div className='text-xs text-gray-400'>
            Live runtime state synced from node events plus Redis 24h analytics.
          </div>
        </div>
        <Button
          type='button'
          className='rounded-md border border-border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70'
          onClick={() => {
            if (!runtimeAnalyticsEnabled) return;
            runtimeAnalyticsQuery.refetch().catch(() => {});
          }}
          disabled={runtimeAnalyticsQuery.isFetching || !runtimeAnalyticsEnabled}
        >
          {!runtimeAnalyticsEnabled
            ? 'Disabled'
            : runtimeAnalyticsQuery.isFetching
              ? 'Refreshing...'
              : 'Refresh'}
        </Button>
      </div>

      <div className='grid gap-2 sm:grid-cols-3'>
        {renderRuntimeAnalysisCard({
          title: 'Run Status',
          children: <div className='mt-1 text-sm text-white'>{formatStatusLabel(runtimeRunStatus)}</div>,
        })}
        {renderRuntimeAnalysisCard({
          title: 'Live Nodes',
          children: <div className='mt-1 text-sm text-white'>{runtimeNodeLiveStates.length}</div>,
        })}
        {renderRuntimeAnalysisCard({
          title: 'Storage',
          children: (
            <div className='mt-1 text-sm text-white'>
              {runtimeAnalyticsEnabled ? (runtimeAnalyticsQuery.data?.storage ?? '—') : 'disabled'}
            </div>
          ),
        })}
      </div>

      {visionModelCapabilityIssues.length > 0
        ? renderRuntimeAnalysisCard({
            title: 'Model Capability',
            className: 'border-rose-500/40 bg-rose-500/5 p-3 text-[11px] text-rose-100',
            titleClassName: 'text-rose-300/90',
            children: (
              <>
                <div className='mt-1 text-sm text-rose-50'>
                  {visionModelCapabilityIssues.length} node
                  {visionModelCapabilityIssues.length === 1 ? '' : 's'} will be blocked by AI
                  Brain preflight.
                </div>
                <RuntimeAnalysisStatLine className='text-rose-100/80'>
                  Fix the node model selection in canvas UI or change the AI Brain default to a
                  multimodal model before running this path.
                </RuntimeAnalysisStatLine>
                <div className='mt-2 space-y-1.5'>
                  {visionModelCapabilityIssues.map((issue) => (
                    <div
                      key={`${issue.nodeId}-${issue.modelId}`}
                      className='rounded border border-rose-500/30 bg-black/20 px-2 py-1.5 text-rose-50'
                    >
                      {buildVisionModelCapabilityErrorMessage(issue)}
                    </div>
                  ))}
                </div>
              </>
            ),
          })
        : null}

      <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-4'>
        {(['running', 'queued', 'polling', 'completed', 'failed', 'cached'] as const).map(
          (status) => (
            <React.Fragment key={status}>
              {renderRuntimeAnalysisCard({
                className: 'border-border/60 bg-card/60 px-2 py-1',
                title: formatStatusLabel(status),
                titleClassName: 'text-gray-500',
                children: <div className='text-gray-200'>{runtimeNodeStatusCounts[status] ?? 0}</div>,
              })}
            </React.Fragment>
          )
        )}
      </div>

      {runtimeNodeLiveStates.length > 0 ? (
        <div className='space-y-1'>
          <div className='text-[10px] uppercase text-gray-500'>Active Node States</div>
          <div className='flex flex-wrap gap-1.5'>
            {runtimeNodeLiveStates.map(
              (entry: { nodeId: string; title: string; status: string }) => (
                <StatusBadge
                  key={entry.nodeId}
                  status={entry.title + ' · ' + formatStatusLabel(entry.status)}
                  variant={statusToVariant(entry.status)}
                  size='sm'
                  title={entry.nodeId}
                  className='font-medium'
                />
              )
            )}
          </div>
        </div>
      ) : (
        <div className='text-xs text-gray-500'>No active runtime node statuses right now.</div>
      )}

      {!runtimeAnalyticsEnabled ? (
        renderRuntimeAnalysisCard({
          title: 'Runtime Analytics',
          className: 'p-3 text-[11px] text-gray-300',
          children: (
            <>
              Runtime analytics is disabled in AI Brain. Live runtime state can still appear above,
              but 24h runtime summaries and trace samples are not queried.
            </>
          ),
        })
      ) : (
        <div className='grid gap-2 sm:grid-cols-4'>
          {renderRuntimeAnalysisCard({
            title: 'Runs (24h)',
            className: 'p-2 text-[11px] text-gray-300',
            children: (
              <>
                <div className='mt-1 text-sm text-white'>
                  {runtimeAnalyticsQuery.data?.runs.total ?? 0}
                </div>
                <RuntimeAnalysisStatLine>
                  Success: {formatPercent(runtimeAnalyticsQuery.data?.runs.successRate ?? 0)}
                </RuntimeAnalysisStatLine>
              </>
            ),
          })}
          {renderRuntimeAnalysisCard({
            title: 'Portable Engine (24h)',
            className: 'p-2 text-[11px] text-gray-300',
            children: (
              <>
                <div className='mt-1 text-sm text-white'>
                  {portableEngineAnalytics?.source ?? 'unavailable'}
                </div>
                <RuntimeAnalysisStatLine className='text-gray-200'>
                  Attempts {portableEngineAnalytics?.totals.attempts ?? 0} · Success{' '}
                  {formatPercent(portableEngineAnalytics?.totals.successRate ?? 0)}
                </RuntimeAnalysisStatLine>
                <RuntimeAnalysisStatLine>
                  Failures {portableEngineAnalytics?.totals.failures ?? 0} (R{' '}
                  {portableEngineAnalytics?.failureStageCounts.resolve ?? 0} · V{' '}
                  {portableEngineAnalytics?.failureStageCounts.validation ?? 0} · RT{' '}
                  {portableEngineAnalytics?.failureStageCounts.runtime ?? 0})
                </RuntimeAnalysisStatLine>
                {latestPortableEngineFailure ? (
                  <RuntimeAnalysisStatLine className='text-gray-500'>
                    Latest {latestPortableEngineFailure.runner} {latestPortableEngineFailure.stage}{' '}
                    · {latestPortableEngineFailure.surface}
                  </RuntimeAnalysisStatLine>
                ) : null}
              </>
            ),
          })}
          {renderRuntimeAnalysisCard({
            title: 'Run Runtime (24h)',
            className: 'text-[11px] text-gray-300',
            children: (
              <>
                <RuntimeAnalysisStatLine className='text-gray-200'>
                  Avg {formatDurationMs(runtimeAnalyticsQuery.data?.runs.avgDurationMs)}
                </RuntimeAnalysisStatLine>
                <RuntimeAnalysisStatLine>
                  p95 {formatDurationMs(runtimeAnalyticsQuery.data?.runs.p95DurationMs)}
                </RuntimeAnalysisStatLine>
                <div className='mt-2 text-[10px] uppercase text-gray-500'>Node spans</div>
                <RuntimeAnalysisStatLine className='text-gray-200'>
                  Runs sampled {runtimeAnalyticsQuery.data?.traces.sampledRuns ?? 0} · spans{' '}
                  {runtimeAnalyticsQuery.data?.traces.sampledSpans ?? 0}
                </RuntimeAnalysisStatLine>
                <RuntimeAnalysisStatLine>
                  Span avg {formatDurationMs(runtimeAnalyticsQuery.data?.traces.avgDurationMs)} ·
                  p95 {formatDurationMs(runtimeAnalyticsQuery.data?.traces.p95DurationMs)}
                </RuntimeAnalysisStatLine>
                {runtimeAnalyticsQuery.data?.traces.slowestSpan ? (
                  <RuntimeAnalysisStatLine className='text-gray-500'>
                    Slowest {runtimeAnalyticsQuery.data.traces.slowestSpan.nodeId} (
                    {runtimeAnalyticsQuery.data.traces.slowestSpan.nodeType}) ·{' '}
                    {formatDurationMs(runtimeAnalyticsQuery.data.traces.slowestSpan.durationMs)}
                  </RuntimeAnalysisStatLine>
                ) : null}
                {(runtimeAnalyticsQuery.data?.traces.topSlowNodes.length ?? 0) > 0 ? (
                  <RuntimeAnalysisStatLine className='text-gray-500'>
                    <div>Top slow:</div>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {runtimeAnalyticsQuery.data?.traces.topSlowNodes
                        .slice(0, 2)
                        .map((entry: AiPathRuntimeTraceSlowNode) => (
                          <RuntimeAnalysisTraceActionChip
                            key={`slow-${entry.nodeId}-${entry.nodeType}`}
                            tone='sky'
                            onClick={() => {
                              void handleInspectTraceNode(entry.nodeId, 'all');
                            }}
                            title='Open latest run detail for this node'
                          >
                            {entry.nodeId} ({formatDurationMs(entry.avgDurationMs)} avg)
                          </RuntimeAnalysisTraceActionChip>
                        ))}
                    </div>
                  </RuntimeAnalysisStatLine>
                ) : null}
                {(runtimeAnalyticsQuery.data?.traces.topFailedNodes.length ?? 0) > 0 ? (
                  <RuntimeAnalysisStatLine className='text-gray-500'>
                    <div>Top failed:</div>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {runtimeAnalyticsQuery.data?.traces.topFailedNodes
                        .slice(0, 2)
                        .map((entry: AiPathRuntimeTraceFailedNode) => (
                          <RuntimeAnalysisTraceActionChip
                            key={`failed-${entry.nodeId}-${entry.nodeType}`}
                            tone='rose'
                            onClick={() => {
                              void handleInspectTraceNode(entry.nodeId, 'failed');
                            }}
                            title='Open latest failed run detail for this node'
                          >
                            {entry.nodeId} ({entry.failedCount}/{entry.spanCount})
                          </RuntimeAnalysisTraceActionChip>
                        ))}
                    </div>
                  </RuntimeAnalysisStatLine>
                ) : null}
              </>
            ),
          })}
          {renderRuntimeAnalysisCard({
            title: 'Kernel coverage (24h)',
            className: 'text-[11px] text-gray-300',
            children: (
              <>
                <RuntimeAnalysisStatLine className='text-gray-200'>
                  Coverage {runtimeKernelRunsWithParity}/{runtimeKernelSampledRuns} (
                  {formatPercent(runtimeKernelRunsCoverageRate)})
                </RuntimeAnalysisStatLine>
                <RuntimeAnalysisStatLine>
                  History entries {runtimeKernelSampledHistoryEntries}
                </RuntimeAnalysisStatLine>
                <div className='mt-2 text-gray-200'>
                  v3 {formatPercent(runtimeKernelV3Rate)} · compatibility{' '}
                  {formatPercent(runtimeKernelCompatibilityRate)} · unknown{' '}
                  {formatPercent(runtimeKernelUnknownRate)}
                </div>
                <div className='mt-1 flex h-2 overflow-hidden rounded bg-card/80 ring-1 ring-border/30'>
                  <div
                    className='bg-emerald-400/70'
                    style={{ width: `${Math.max(0, Math.min(100, runtimeKernelV3Rate))}%` }}
                    aria-hidden
                  />
                  <div
                    className='bg-amber-400/70'
                    style={{ width: `${Math.max(0, Math.min(100, runtimeKernelCompatibilityRate))}%` }}
                    aria-hidden
                  />
                  <div
                    className='bg-slate-500/70'
                    style={{ width: `${Math.max(0, Math.min(100, runtimeKernelUnknownRate))}%` }}
                    aria-hidden
                  />
                </div>
                {runtimeKernelCompatibilityEntries > 0 ? (
                  <div className='mt-2 text-[10px] text-amber-200/90'>
                    Compatibility traces are historical rollout evidence only. Live execution is
                    strict native.
                  </div>
                ) : null}
                <div className='mt-2 text-gray-400'>
                  Resolution O/R/M/U: {runtimeKernelResolutionOverride}/
                  {runtimeKernelResolutionRegistry}/{runtimeKernelResolutionMissing}/
                  {runtimeKernelResolutionUnknown}
                </div>
                {runtimeKernelCodeObjectIds.length > 0 ? (
                  <div className='mt-2 text-gray-500'>
                    <div>Top code objects:</div>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {runtimeKernelCodeObjectIds.slice(0, 3).map((codeObjectId: string) => (
                        <span
                          key={codeObjectId}
                          className='rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-100'
                          title={codeObjectId}
                        >
                          {codeObjectId}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ),
          })}
        </div>
      )}
    </Card>
  );
}
