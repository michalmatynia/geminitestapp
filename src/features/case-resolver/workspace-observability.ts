import type {
  CaseResolverWorkspaceDebugEvent,
  CaseResolverWorkspaceObservabilitySnapshot,
  PercentileSnapshot,
  WorkspaceHydrationSelectionSnapshot,
  RequestedContextSnapshot,
  RuntimeCounterSnapshot,
  RuntimeDurationSnapshot,
} from '@/shared/contracts/case-resolver';
import { createCaseResolverWorkspaceMutationId } from './utils/workspace-persistence-utils';

const CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY = '__caseResolverWorkspaceDebugEvents';
const CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME = 'case-resolver-workspace-debug';
const CASE_RESOLVER_WORKSPACE_DEBUG_LIMIT = 200;

const readDebugBuffer = (): CaseResolverWorkspaceDebugEvent[] => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY]?: CaseResolverWorkspaceDebugEvent[];
  };
  if (!Array.isArray(scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY])) {
    scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] = [];
  }
  return scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] ?? [];
};

const writeDebugBuffer = (events: CaseResolverWorkspaceDebugEvent[]): void => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY]?: CaseResolverWorkspaceDebugEvent[];
  };
  scope[CASE_RESOLVER_WORKSPACE_DEBUG_EVENTS_KEY] = events;
};

export const logCaseResolverWorkspaceEvent = (
  event: Omit<CaseResolverWorkspaceDebugEvent, 'id' | 'timestamp'>
): void => {
  const entry: CaseResolverWorkspaceDebugEvent = {
    id: createCaseResolverWorkspaceMutationId('workspace-debug'),
    timestamp: new Date().toISOString(),
    ...event,
  };
  const nextEvents = [...readDebugBuffer(), entry].slice(-CASE_RESOLVER_WORKSPACE_DEBUG_LIMIT);
  writeDebugBuffer(nextEvents);
  if (typeof window !== 'undefined') {
    // Defer notification so debug-panel state updates never run inside another component render.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME));
    }, 0);
  }
};

export const readCaseResolverWorkspaceDebugEvents = (): CaseResolverWorkspaceDebugEvent[] => [
  ...readDebugBuffer(),
];

export const getCaseResolverWorkspaceDebugEventName = (): string =>
  CASE_RESOLVER_WORKSPACE_DEBUG_EVENT_NAME;

const percentile = (values: number[], ratio: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
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

const parsePositiveIntegerToken = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

const sumCounterMetric = (events: CaseResolverWorkspaceDebugEvent[], action: string): number =>
  events.reduce((count: number, event: CaseResolverWorkspaceDebugEvent): number => {
    if (event.action !== action) return count;
    const tokens = parseEventMessageTokens(event.message);
    const step = parsePositiveIntegerToken(tokens['count']);
    return count + (step > 0 ? step : 1);
  }, 0);

const collectDurationMetricValues = (
  events: CaseResolverWorkspaceDebugEvent[],
  action: string
): number[] =>
  events
    .filter((event: CaseResolverWorkspaceDebugEvent): boolean => event.action === action)
    .map((event: CaseResolverWorkspaceDebugEvent): number => event.durationMs ?? 0)
    .filter((value: number): boolean => Number.isFinite(value) && value >= 0);

const getLatestHydrationSelection = (
  events: CaseResolverWorkspaceDebugEvent[]
): WorkspaceHydrationSelectionSnapshot | null => {
  const latestEvent = [...events]
    .reverse()
    .find(
      (event: CaseResolverWorkspaceDebugEvent): boolean =>
        event.action === 'hydrate_workspace_source_selected'
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
  events: CaseResolverWorkspaceDebugEvent[]
): RequestedContextSnapshot | null => {
  const latestEvent = [...events]
    .reverse()
    .find((event: CaseResolverWorkspaceDebugEvent): boolean =>
      event.action.startsWith('requested_context_')
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
    .filter(
      (event): boolean =>
        event.action === 'persist_success' ||
        event.action === 'persist_conflict' ||
        event.action === 'persist_failed'
    )
    .map((event): number => event.durationMs ?? 0)
    .filter((value): boolean => Number.isFinite(value) && value >= 0);
  const payloadSizes = events
    .filter((event): boolean => event.action === 'persist_attempt')
    .map((event): number => event.payloadBytes ?? 0)
    .filter((value): boolean => Number.isFinite(value) && value >= 0);
  const runtimeCounters: RuntimeCounterSnapshot = {
    selectorRecomputeCount: sumCounterMetric(events, 'selector_recompute_count'),
    contextStateTransitionCount: sumCounterMetric(events, 'context_state_transition_count'),
  };
  const runtimeDurations: RuntimeDurationSnapshot = {
    treeScopeResolveMs: buildPercentileSnapshot(
      collectDurationMetricValues(events, 'tree_scope_resolve_ms')
    ),
    caseSearchFilterMs: buildPercentileSnapshot(
      collectDurationMetricValues(events, 'case_search_filter_ms')
    ),
    editorDirtyEvalMs: buildPercentileSnapshot(
      collectDurationMetricValues(events, 'editor_dirty_eval_ms')
    ),
  };
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
    runtimeCounters,
    runtimeDurations,
    latestHydrationSelection,
    latestRequestedContext,
  };
};

export const readCaseResolverWorkspaceObservabilitySnapshot =
  (): CaseResolverWorkspaceObservabilitySnapshot => {
    const events = readCaseResolverWorkspaceDebugEvents();
    return buildCaseResolverWorkspaceObservabilitySnapshot(events);
  };
