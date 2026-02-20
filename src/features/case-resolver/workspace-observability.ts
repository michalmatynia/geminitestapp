import {
  readCaseResolverWorkspaceDebugEvents,
  type CaseResolverWorkspaceDebugEvent,
} from './workspace-persistence';

type PercentileSnapshot = {
  count: number;
  p50: number;
  p95: number;
  max: number;
};

export type CaseResolverWorkspaceObservabilitySnapshot = {
  generatedAt: string;
  sampleSize: number;
  actionCounts: Record<string, number>;
  persistAttempts: number;
  persistSuccesses: number;
  persistConflicts: number;
  persistFailures: number;
  conflictRate: number;
  saveSuccessRate: number;
  persistDurationMs: PercentileSnapshot;
  payloadBytes: PercentileSnapshot;
};

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * ratio))
  );
  return sorted[index] ?? 0;
};

const buildPercentileSnapshot = (values: number[]): PercentileSnapshot => {
  return {
    count: values.length,
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: values.length > 0 ? Math.max(...values) : 0,
  };
};

const countByAction = (events: CaseResolverWorkspaceDebugEvent[]): Record<string, number> => {
  return events.reduce<Record<string, number>>((acc, event) => {
    const action = event.action.trim() || 'unknown';
    acc[action] = (acc[action] ?? 0) + 1;
    return acc;
  }, {});
};

export const buildCaseResolverWorkspaceObservabilitySnapshot = (
  events: CaseResolverWorkspaceDebugEvent[],
  nowMs: number = Date.now()
): CaseResolverWorkspaceObservabilitySnapshot => {
  const actionCounts = countByAction(events);
  const persistAttempts = actionCounts['persist_attempt'] ?? 0;
  const persistSuccesses = actionCounts['persist_success'] ?? 0;
  const persistConflicts = actionCounts['persist_conflict'] ?? 0;
  const persistFailures =
    (actionCounts['persist_failed'] ?? 0) +
    (actionCounts['persist_rejected_payload_too_large'] ?? 0);
  const conflictRate = persistAttempts > 0 ? persistConflicts / persistAttempts : 0;
  const saveSuccessRate = persistAttempts > 0 ? persistSuccesses / persistAttempts : 0;

  const persistDurations = events
    .filter((event): boolean => (
      event.action === 'persist_success' ||
      event.action === 'persist_conflict' ||
      event.action === 'persist_failed'
    ))
    .map((event): number => event.durationMs ?? 0)
    .filter((value): boolean => Number.isFinite(value) && value >= 0);
  const payloadSizes = events
    .filter((event): boolean => event.action === 'persist_attempt')
    .map((event): number => event.payloadBytes ?? 0)
    .filter((value): boolean => Number.isFinite(value) && value >= 0);

  return {
    generatedAt: new Date(nowMs).toISOString(),
    sampleSize: events.length,
    actionCounts,
    persistAttempts,
    persistSuccesses,
    persistConflicts,
    persistFailures,
    conflictRate,
    saveSuccessRate,
    persistDurationMs: buildPercentileSnapshot(persistDurations),
    payloadBytes: buildPercentileSnapshot(payloadSizes),
  };
};

export const readCaseResolverWorkspaceObservabilitySnapshot =
  (): CaseResolverWorkspaceObservabilitySnapshot => {
    const events = readCaseResolverWorkspaceDebugEvents();
    return buildCaseResolverWorkspaceObservabilitySnapshot(events);
  };
