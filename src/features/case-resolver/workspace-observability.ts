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

type WorkspaceHydrationSelectionSnapshot = {
  timestamp: string;
  source: string | null;
  reason: string | null;
  hasStore: boolean | null;
  hasHeavy: boolean | null;
  workspaceRevision: number | null;
};

type RequestedContextSnapshot = {
  timestamp: string;
  action: string;
  requestKey: string | null;
  requestedCaseStatus: string | null;
  requestedCaseIssue: string | null;
  resolvedVia: string | null;
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
  latestHydrationSelection: WorkspaceHydrationSelectionSnapshot | null;
  latestRequestedContext: RequestedContextSnapshot | null;
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

const parseEventMessageTokens = (message: string | null | undefined): Record<string, string> => {
  if (typeof message !== 'string' || message.trim().length === 0) return {};
  return message
    .trim()
    .split(/\s+/)
    .reduce<Record<string, string>>((acc, token) => {
      const separatorIndex = token.indexOf('=');
      if (separatorIndex <= 0) return acc;
      const key = token.slice(0, separatorIndex).trim();
      const value = token.slice(separatorIndex + 1).trim();
      if (!key) return acc;
      acc[key] = value;
      return acc;
    }, {});
};

const parseBooleanToken = (value: string | undefined): boolean | null => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
};

const normalizeNullableValue = (value: string | undefined): string | null => {
  if (!value || value === 'none' || value === '<none>' || value === '-') return null;
  return value;
};

const getLatestHydrationSelection = (
  events: CaseResolverWorkspaceDebugEvent[],
): WorkspaceHydrationSelectionSnapshot | null => {
  const latestEvent = [...events]
    .reverse()
    .find((event: CaseResolverWorkspaceDebugEvent): boolean =>
      event.action === 'hydrate_workspace_source_selected',
    );
  if (!latestEvent) return null;
  const messageTokens = parseEventMessageTokens(latestEvent.message);
  return {
    timestamp: latestEvent.timestamp,
    source: normalizeNullableValue(messageTokens['source']),
    reason: normalizeNullableValue(messageTokens['reason']),
    hasStore: parseBooleanToken(messageTokens['has_store']),
    hasHeavy: parseBooleanToken(messageTokens['has_heavy']),
    workspaceRevision:
      typeof latestEvent.workspaceRevision === 'number' &&
      Number.isFinite(latestEvent.workspaceRevision)
        ? latestEvent.workspaceRevision
        : null,
  };
};

const getLatestRequestedContext = (
  events: CaseResolverWorkspaceDebugEvent[],
): RequestedContextSnapshot | null => {
  const latestEvent = [...events]
    .reverse()
    .find((event: CaseResolverWorkspaceDebugEvent): boolean =>
      event.action.startsWith('requested_context_'),
    );
  if (!latestEvent) return null;
  const messageTokens = parseEventMessageTokens(latestEvent.message);
  return {
    timestamp: latestEvent.timestamp,
    action: latestEvent.action,
    requestKey: normalizeNullableValue(messageTokens['request_key']),
    requestedCaseStatus: normalizeNullableValue(messageTokens['requested_case_status']),
    requestedCaseIssue: normalizeNullableValue(messageTokens['requested_case_issue']),
    resolvedVia: normalizeNullableValue(messageTokens['resolved_via']),
  };
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
  const latestHydrationSelection = getLatestHydrationSelection(events);
  const latestRequestedContext = getLatestRequestedContext(events);

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
    latestHydrationSelection,
    latestRequestedContext,
  };
};

export const readCaseResolverWorkspaceObservabilitySnapshot =
  (): CaseResolverWorkspaceObservabilitySnapshot => {
    const events = readCaseResolverWorkspaceDebugEvents();
    return buildCaseResolverWorkspaceObservabilitySnapshot(events);
  };
