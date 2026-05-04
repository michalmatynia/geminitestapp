import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getPortablePathRunExecutionSnapshot } from '@/shared/lib/ai-paths/portable-engine/portable-engine-observability';
import type { PortablePathRunExecutionSnapshot } from '@/shared/lib/ai-paths/portable-engine/portable-engine-run-observability';

const RUN_EXECUTION_RECENT_FAILURE_LIMIT = 10;
const UNKNOWN_RUN_EXECUTION_FAILURE_MESSAGE = 'Unknown portable engine runtime failure.';

type PortablePathTrendRunExecutionEvent = PortablePathRunExecutionSnapshot['recentEvents'][number];

export type TrendRunExecutionSummary = {
  source: 'in_memory' | 'unavailable';
  totals: PortablePathRunExecutionSnapshot['totals'] & {
    successRate: number;
    failureRate: number;
  };
  byRunner: PortablePathRunExecutionSnapshot['byRunner'];
  bySurface: PortablePathRunExecutionSnapshot['bySurface'];
  byInputSource: PortablePathRunExecutionSnapshot['bySource'];
  failureStageCounts: PortablePathRunExecutionSnapshot['failureStageCounts'];
  topFailureErrors: Array<{ reason: string; count: number }>;
  recentFailures: Array<{
    at: string;
    runner: PortablePathTrendRunExecutionEvent['runner'];
    surface: PortablePathTrendRunExecutionEvent['surface'];
    source: PortablePathTrendRunExecutionEvent['source'];
    stage: NonNullable<PortablePathTrendRunExecutionEvent['failureStage']>;
    error: string;
    durationMs: number;
    validateBeforeRun: boolean;
    validationMode: PortablePathTrendRunExecutionEvent['validationMode'];
  }>;
};

const createEmptyRunExecutionCounts = (): {
  attempts: number;
  successes: number;
  failures: number;
} => ({
  attempts: 0,
  successes: 0,
  failures: 0,
});

const createEmptyRunExecutionSummary = (): TrendRunExecutionSummary => ({
  source: 'unavailable',
  totals: {
    attempts: 0,
    successes: 0,
    failures: 0,
    successRate: 0,
    failureRate: 0,
  },
  byRunner: {
    client: createEmptyRunExecutionCounts(),
    server: createEmptyRunExecutionCounts(),
  },
  bySurface: {
    canvas: createEmptyRunExecutionCounts(),
    product: createEmptyRunExecutionCounts(),
    api: createEmptyRunExecutionCounts(),
  },
  byInputSource: {
    portable_package: createEmptyRunExecutionCounts(),
    portable_envelope: createEmptyRunExecutionCounts(),
    semantic_canvas: createEmptyRunExecutionCounts(),
    path_config: createEmptyRunExecutionCounts(),
  },
  failureStageCounts: {
    resolve: 0,
    validation: 0,
    runtime: 0,
  },
  topFailureErrors: [],
  recentFailures: [],
});

const computeRunExecutionRate = (part: number, whole: number): number => {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
};

const getFailureMessage = (value: unknown): string => {
  if (typeof value !== 'string') return UNKNOWN_RUN_EXECUTION_FAILURE_MESSAGE;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : UNKNOWN_RUN_EXECUTION_FAILURE_MESSAGE;
};

const toTopReasonBreakdown = (counts: Record<string, number>): Array<{ reason: string; count: number }> =>
  Object.entries(counts)
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

const summarizeRunExecutionFailures = (
  events: PortablePathRunExecutionSnapshot['recentEvents']
): {
  topFailureErrors: Array<{ reason: string; count: number }>;
  recentFailures: TrendRunExecutionSummary['recentFailures'];
} => {
  const recentFailures = events
    .slice(-RUN_EXECUTION_RECENT_FAILURE_LIMIT)
    .reverse()
    .map((event) => ({
      at: event.at,
      runner: event.runner,
      surface: event.surface,
      source: event.source,
      stage: event.failureStage ?? 'runtime',
      error: getFailureMessage(event.error),
      durationMs: event.durationMs,
      validateBeforeRun: event.validateBeforeRun,
      validationMode: event.validationMode,
    }));
  const failureErrorCounts: Record<string, number> = {};
  for (const event of events) {
    const message = getFailureMessage(event.error);
    failureErrorCounts[message] = (failureErrorCounts[message] ?? 0) + 1;
  }
  return {
    topFailureErrors: toTopReasonBreakdown(failureErrorCounts),
    recentFailures,
  };
};

export const buildRunExecutionSummary = (): TrendRunExecutionSummary => {
  const summary = createEmptyRunExecutionSummary();
  try {
    const snapshot = getPortablePathRunExecutionSnapshot();
    const failureEvents = snapshot.recentEvents.filter((event) => event.outcome === 'failure');
    const failureSummary = summarizeRunExecutionFailures(failureEvents);
    return {
      source: 'in_memory',
      totals: {
        attempts: snapshot.totals.attempts,
        successes: snapshot.totals.successes,
        failures: snapshot.totals.failures,
        successRate: computeRunExecutionRate(snapshot.totals.successes, snapshot.totals.attempts),
        failureRate: computeRunExecutionRate(snapshot.totals.failures, snapshot.totals.attempts),
      },
      byRunner: snapshot.byRunner,
      bySurface: snapshot.bySurface,
      byInputSource: snapshot.bySource,
      failureStageCounts: snapshot.failureStageCounts,
      topFailureErrors: failureSummary.topFailureErrors,
      recentFailures: failureSummary.recentFailures,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return summary;
  }
};
