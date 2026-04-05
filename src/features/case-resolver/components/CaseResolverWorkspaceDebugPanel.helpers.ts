import type { CaseResolverWorkspaceDebugEvent } from '@/shared/contracts/case-resolver/workspace';
import type { CaseResolverWorkspaceObservabilitySnapshot, RequestedContextSnapshot, WorkspaceHydrationSelectionSnapshot } from '@/shared/contracts/case-resolver/base';

export type CaseResolverWorkspaceDebugMetric = {
  label: string;
  value: string;
};

export const formatCaseResolverWorkspaceDebugBoolean = (
  value: boolean | null
): string => {
  if (value === null) {
    return 'n/a';
  }

  return value ? 'true' : 'false';
};

export const buildCaseResolverWorkspaceDebugMetrics = (
  snapshot: CaseResolverWorkspaceObservabilitySnapshot
): CaseResolverWorkspaceDebugMetric[] => [
  { label: 'save p95', value: `${Math.round(snapshot.persistDurationMs.p95)}ms` },
  { label: 'payload p95', value: `${Math.round(snapshot.payloadBytes.p95)}B` },
  { label: 'success', value: `${(snapshot.saveSuccessRate * 100).toFixed(1)}%` },
  { label: 'conflict', value: `${(snapshot.conflictRate * 100).toFixed(1)}%` },
];

export const buildCaseResolverWorkspaceHydrationLines = (
  hydration: WorkspaceHydrationSelectionSnapshot
): string[] => [
  `source=${hydration.source ?? 'n/a'} reason=${hydration.reason ?? 'n/a'}`,
  `has_store=${formatCaseResolverWorkspaceDebugBoolean(hydration.hasStore)} has_heavy=${formatCaseResolverWorkspaceDebugBoolean(hydration.hasHeavy)} rev=${hydration.workspaceRevision ?? 'n/a'}`,
];

export const buildCaseResolverWorkspaceRequestedContextLines = (
  requestedContext: RequestedContextSnapshot
): string[] => [
  `action=${requestedContext.action}`,
  `status=${requestedContext.requestedCaseStatus ?? 'n/a'} issue=${requestedContext.requestedCaseIssue ?? 'n/a'} via=${requestedContext.resolvedVia ?? 'n/a'}`,
  `request_key=${requestedContext.requestKey ?? 'n/a'}`,
];

export const buildCaseResolverWorkspaceEventLines = (
  event: CaseResolverWorkspaceDebugEvent
): string[] => [
  `rev=${event.workspaceRevision ?? '-'} exp=${event.expectedRevision ?? '-'} cur=${event.currentRevision ?? '-'} mut=${event.mutationId ?? '-'}`,
  `dur=${event.durationMs ?? '-'}ms size=${event.payloadBytes ?? '-'}B`,
];

export const getRecentCaseResolverWorkspaceDebugEvents = (
  events: CaseResolverWorkspaceDebugEvent[],
  limit = 25
): CaseResolverWorkspaceDebugEvent[] => events.slice(-limit).reverse();
