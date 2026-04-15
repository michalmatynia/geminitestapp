import 'server-only';

import {
  AiPathRunRecord,
  AiPathRuntimeTraceAnalytics,
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummary,
} from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  TRACE_NODE_HIGHLIGHT_LIMIT,
  TRACE_RUN_SAMPLE_LIMIT,
  SUMMARY_QUERY_TIMEOUT_MS,
} from './config';
import { asRecord, toNonEmptyString, toFiniteDurationMs, withTimeout } from './utils';

export const extractRuntimeTraceNodeSpans = (run: AiPathRunRecord): unknown[] => {
  const meta = asRecord(run.meta);
  if (!meta) return [];
  const runtimeTrace = asRecord(meta['runtimeTrace']);
  if (!runtimeTrace) return [];
  const spans = runtimeTrace['spans'];
  if (Array.isArray(spans)) return spans;
  const profile = asRecord(runtimeTrace['profile']);
  if (!profile) return [];
  const nodeSpans = profile['nodeSpans'];
  return Array.isArray(nodeSpans) ? nodeSpans : [];
};

export const emptyTraceAnalytics = (): AiPathRuntimeTraceAnalytics => ({
  source: 'none',
  sampledRuns: 0,
  sampledSpans: 0,
  completedSpans: 0,
  failedSpans: 0,
  cachedSpans: 0,
  avgDurationMs: null,
  p95DurationMs: null,
  slowestSpan: null,
  topSlowNodes: [],
  topFailedNodes: [],
  kernelParity: {
    sampledRuns: 0,
    runsWithKernelParity: 0,
    sampledHistoryEntries: 0,
    strategyCounts: {
      code_object_v3: 0,
      compatibility: 0,
      unknown: 0,
    },
    resolutionSourceCounts: {
      override: 0,
      registry: 0,
      missing: 0,
      unknown: 0,
    },
    codeObjectIds: [],
  },
  truncated: false,
});

const normalizeNonNegativeInteger = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;

const extractRuntimeTraceKernelParity = (
  run: AiPathRunRecord
): AiPathRuntimeTraceAnalytics['kernelParity'] | null => {
  const meta = asRecord(run.meta);
  if (!meta) return null;
  const runtimeTrace = asRecord(meta['runtimeTrace']);
  if (!runtimeTrace) return null;
  const kernelParity = asRecord(runtimeTrace['kernelParity']);
  if (!kernelParity) return null;

  const strategyCounts = asRecord(kernelParity['strategyCounts']);
  const resolutionSourceCounts = asRecord(kernelParity['resolutionSourceCounts']);
  const rawCodeObjectIds = Array.isArray(kernelParity['codeObjectIds'])
    ? kernelParity['codeObjectIds']
    : [];

  return {
    sampledRuns: 0,
    runsWithKernelParity: 0,
    sampledHistoryEntries: normalizeNonNegativeInteger(kernelParity['sampledHistoryEntries']),
    strategyCounts: {
      code_object_v3: normalizeNonNegativeInteger(strategyCounts?.['code_object_v3']),
      compatibility: normalizeNonNegativeInteger(strategyCounts?.['compatibility']),
      unknown: normalizeNonNegativeInteger(strategyCounts?.['unknown']),
    },
    resolutionSourceCounts: {
      override: normalizeNonNegativeInteger(resolutionSourceCounts?.['override']),
      registry: normalizeNonNegativeInteger(resolutionSourceCounts?.['registry']),
      missing: normalizeNonNegativeInteger(resolutionSourceCounts?.['missing']),
      unknown: normalizeNonNegativeInteger(resolutionSourceCounts?.['unknown']),
    },
    codeObjectIds: rawCodeObjectIds
      .filter(
        (entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0
      )
      .map((entry: string) => entry.trim())
      .slice(0, 25),
  };
};

type NodeAggregate = {
  nodeId: string;
  nodeType: string;
  spanCount: number;
  failedCount: number;
  durationCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
};

type RuntimeTraceSummaryState = {
  durations: number[];
  nodeAggregates: Map<string, NodeAggregate>;
  sampledSpans: number;
  completedSpans: number;
  failedSpans: number;
  cachedSpans: number;
  slowestSpan: AiPathRuntimeTraceAnalytics['slowestSpan'];
  kernelParity: AiPathRuntimeTraceAnalytics['kernelParity'];
  codeObjectIdSet: Set<string>;
};

const createRuntimeTraceSummaryState = (
  sampledRuns: number
): RuntimeTraceSummaryState => ({
  durations: [],
  nodeAggregates: new Map<string, NodeAggregate>(),
  sampledSpans: 0,
  completedSpans: 0,
  failedSpans: 0,
  cachedSpans: 0,
  slowestSpan: null,
  kernelParity: {
    sampledRuns,
    runsWithKernelParity: 0,
    sampledHistoryEntries: 0,
    strategyCounts: {
      code_object_v3: 0,
      compatibility: 0,
      unknown: 0,
    },
    resolutionSourceCounts: {
      override: 0,
      registry: 0,
      missing: 0,
      unknown: 0,
    },
    codeObjectIds: [],
  },
  codeObjectIdSet: new Set<string>(),
});

const mergeRuntimeTraceKernelParity = (
  state: RuntimeTraceSummaryState,
  parity: NonNullable<ReturnType<typeof extractRuntimeTraceKernelParity>>
): void => {
  state.kernelParity.runsWithKernelParity += 1;
  state.kernelParity.sampledHistoryEntries += parity.sampledHistoryEntries;
  state.kernelParity.strategyCounts.code_object_v3 += parity.strategyCounts.code_object_v3;
  state.kernelParity.strategyCounts.compatibility += parity.strategyCounts.compatibility;
  state.kernelParity.strategyCounts.unknown += parity.strategyCounts.unknown;
  state.kernelParity.resolutionSourceCounts.override += parity.resolutionSourceCounts.override;
  state.kernelParity.resolutionSourceCounts.registry += parity.resolutionSourceCounts.registry;
  state.kernelParity.resolutionSourceCounts.missing += parity.resolutionSourceCounts.missing;
  state.kernelParity.resolutionSourceCounts.unknown += parity.resolutionSourceCounts.unknown;
  parity.codeObjectIds.forEach((codeObjectId: string) => {
    state.codeObjectIdSet.add(codeObjectId);
  });
};

const resolveRuntimeTraceNodeAggregate = (
  state: RuntimeTraceSummaryState,
  nodeId: string,
  nodeType: string
): NodeAggregate => {
  const aggregateKey = `${nodeId}::${nodeType}`;
  return (
    state.nodeAggregates.get(aggregateKey) ?? {
      nodeId,
      nodeType,
      spanCount: 0,
      failedCount: 0,
      durationCount: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
    }
  );
};

const updateRuntimeTraceSlowestSpan = (
  state: RuntimeTraceSummaryState,
  run: AiPathRunRecord,
  span: Record<string, unknown>,
  input: {
    nodeId: string;
    nodeType: string;
    status: string;
    durationMs: number;
  }
): void => {
  if (state.slowestSpan && input.durationMs <= state.slowestSpan.durationMs) {
    return;
  }

  state.slowestSpan = {
    runId: toNonEmptyString(run.id) ?? 'unknown',
    spanId: toNonEmptyString(span['spanId']) ?? 'unknown',
    nodeId: input.nodeId,
    nodeType: input.nodeType,
    status: input.status,
    durationMs: input.durationMs,
  };
};

const collectRuntimeTraceSpan = (
  state: RuntimeTraceSummaryState,
  run: AiPathRunRecord,
  spanValue: unknown
): void => {
  const span = asRecord(spanValue);
  if (!span) return;

  state.sampledSpans += 1;
  const nodeId = toNonEmptyString(span['nodeId']) ?? 'unknown';
  const nodeType = toNonEmptyString(span['nodeType']) ?? 'unknown';
  const status = toNonEmptyString(span['status']) ?? 'unknown';
  if (status === 'completed') state.completedSpans += 1;
  if (status === 'failed') state.failedSpans += 1;
  if (status === 'cached') state.cachedSpans += 1;

  const aggregateKey = `${nodeId}::${nodeType}`;
  const aggregate = resolveRuntimeTraceNodeAggregate(state, nodeId, nodeType);
  aggregate.spanCount += 1;
  if (status === 'failed') {
    aggregate.failedCount += 1;
  }

  const durationMs = toFiniteDurationMs(span['durationMs'], span['startedAt'], span['finishedAt']);
  if (durationMs !== null) {
    state.durations.push(durationMs);
    aggregate.durationCount += 1;
    aggregate.totalDurationMs += durationMs;
    aggregate.maxDurationMs = Math.max(aggregate.maxDurationMs, durationMs);
    updateRuntimeTraceSlowestSpan(state, run, span, { nodeId, nodeType, status, durationMs });
  }

  state.nodeAggregates.set(aggregateKey, aggregate);
};

const buildTopSlowNodes = (nodeAggregates: Map<string, NodeAggregate>) =>
  Array.from(nodeAggregates.values())
    .filter((aggregate) => aggregate.durationCount > 0)
    .map((aggregate) => ({
      nodeId: aggregate.nodeId,
      nodeType: aggregate.nodeType,
      spanCount: aggregate.spanCount,
      avgDurationMs: Math.round(aggregate.totalDurationMs / aggregate.durationCount),
      maxDurationMs: aggregate.maxDurationMs,
      totalDurationMs: aggregate.totalDurationMs,
    }))
    .sort((left, right) => {
      if (right.totalDurationMs !== left.totalDurationMs) {
        return right.totalDurationMs - left.totalDurationMs;
      }
      return right.maxDurationMs - left.maxDurationMs;
    })
    .slice(0, TRACE_NODE_HIGHLIGHT_LIMIT);

const buildTopFailedNodes = (nodeAggregates: Map<string, NodeAggregate>) =>
  Array.from(nodeAggregates.values())
    .filter((aggregate) => aggregate.failedCount > 0)
    .map((aggregate) => ({
      nodeId: aggregate.nodeId,
      nodeType: aggregate.nodeType,
      failedCount: aggregate.failedCount,
      spanCount: aggregate.spanCount,
    }))
    .sort((left, right) => {
      if (right.failedCount !== left.failedCount) {
        return right.failedCount - left.failedCount;
      }
      return right.spanCount - left.spanCount;
    })
    .slice(0, TRACE_NODE_HIGHLIGHT_LIMIT);

export const summarizeRuntimeTraceAnalytics = (input: {
  runs: AiPathRunRecord[];
  total?: number;
}): AiPathRuntimeTraceAnalytics => {
  const runs = input.runs ?? [];
  const state = createRuntimeTraceSummaryState(runs.length);

  runs.forEach((run: AiPathRunRecord): void => {
    const parity = extractRuntimeTraceKernelParity(run);
    if (parity) {
      mergeRuntimeTraceKernelParity(state, parity);
    }

    const spans = extractRuntimeTraceNodeSpans(run);
    spans.forEach((spanValue: unknown): void => collectRuntimeTraceSpan(state, run, spanValue));
  });

  state.durations.sort((a: number, b: number): number => a - b);
  const avgDurationMs =
    state.durations.length > 0
      ? Math.round(
        state.durations.reduce((sum: number, value: number) => sum + value, 0) /
          state.durations.length
      )
      : null;
  const p95DurationMs =
    state.durations.length > 0
      ? state.durations[
          Math.min(
            state.durations.length - 1,
            Math.max(0, Math.ceil(state.durations.length * 0.95) - 1)
          )
      ]!
      : null;
  const topSlowNodes = buildTopSlowNodes(state.nodeAggregates);
  const topFailedNodes = buildTopFailedNodes(state.nodeAggregates);

  const total = typeof input.total === 'number' ? Math.max(0, input.total) : runs.length;
  const sampledRuns = runs.length;
  state.kernelParity.codeObjectIds = Array.from(state.codeObjectIdSet).slice(0, 25);
  return {
    source: 'db_sample',
    sampledRuns,
    sampledSpans: state.sampledSpans,
    completedSpans: state.completedSpans,
    failedSpans: state.failedSpans,
    cachedSpans: state.cachedSpans,
    avgDurationMs,
    p95DurationMs,
    slowestSpan: state.slowestSpan,
    topSlowNodes,
    topFailedNodes,
    kernelParity: state.kernelParity,
    truncated: total > sampledRuns,
  };
};

export const loadRuntimeTraceAnalytics = async (input: {
  from: Date;
  to: Date;
}): Promise<AiPathRuntimeTraceAnalytics> => {
  try {
    const repo = await getPathRunRepository();
    const result = await withTimeout(
      repo.listRuns({
        statuses: ['completed', 'failed', 'canceled', 'dead_lettered'],
        createdAfter: input.from.toISOString(),
        createdBefore: input.to.toISOString(),
        limit: TRACE_RUN_SAMPLE_LIMIT,
        offset: 0,
        includeTotal: false,
      }),
      SUMMARY_QUERY_TIMEOUT_MS,
      'ai-paths runtime trace analytics query'
    );
    return summarizeRuntimeTraceAnalytics({
      runs: result.runs,
      total: result.total,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('Failed to load runtime trace analytics sample', {
      service: 'ai-paths-analytics',
      error,
    });
    return emptyTraceAnalytics();
  }
};

export const emptySummary = (
  from: Date,
  to: Date,
  range: AiPathRuntimeAnalyticsRange | 'custom'
): AiPathRuntimeAnalyticsSummary => ({
  from: from.toISOString(),
  to: to.toISOString(),
  range,
  storage: 'disabled',
  runs: {
    total: 0,
    queued: 0,
    started: 0,
    completed: 0,
    failed: 0,
    canceled: 0,
    deadLettered: 0,
    blockedOnLease: 0,
    handoffReady: 0,
    successRate: 0,
    failureRate: 0,
    deadLetterRate: 0,
    avgDurationMs: null,
    p95DurationMs: null,
  },
  nodes: {
    started: 0,
    completed: 0,
    failed: 0,
    queued: 0,
    running: 0,
    polling: 0,
    cached: 0,
    waitingCallback: 0,
  },
  brain: {
    analyticsReports: 0,
    logReports: 0,
    totalReports: 0,
    warningReports: 0,
    errorReports: 0,
  },
  traces: emptyTraceAnalytics(),
  generatedAt: new Date().toISOString(),
});
