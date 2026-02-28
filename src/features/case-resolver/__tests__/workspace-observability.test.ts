import { describe, expect, it } from 'vitest';

import { buildCaseResolverWorkspaceObservabilitySnapshot } from '@/features/case-resolver/workspace-observability';
import type { CaseResolverWorkspaceDebugEvent } from '@/features/case-resolver/workspace-persistence';

const buildEvent = (
  input: Partial<CaseResolverWorkspaceDebugEvent> & Pick<CaseResolverWorkspaceDebugEvent, 'action'>
): CaseResolverWorkspaceDebugEvent => {
  return {
    id: input.id ?? 'event-id',
    timestamp: input.timestamp ?? '2026-02-20T16:00:00.000Z',
    source: input.source ?? 'case_view',
    action: input.action,
    message: input.message,
    mutationId: input.mutationId ?? null,
    expectedRevision: input.expectedRevision ?? null,
    currentRevision: input.currentRevision ?? null,
    workspaceRevision: input.workspaceRevision ?? null,
    durationMs: input.durationMs,
    payloadBytes: input.payloadBytes,
  };
};

describe('case resolver workspace observability snapshot', () => {
  it('computes action counts and persistence rates', () => {
    const events: CaseResolverWorkspaceDebugEvent[] = [
      buildEvent({ action: 'persist_attempt', payloadBytes: 1_000 }),
      buildEvent({ action: 'persist_success', durationMs: 120 }),
      buildEvent({ action: 'persist_attempt', payloadBytes: 1_200 }),
      buildEvent({ action: 'persist_conflict', durationMs: 250 }),
      buildEvent({ action: 'persist_attempt', payloadBytes: 1_400 }),
      buildEvent({ action: 'persist_failed', durationMs: 300 }),
    ];

    const snapshot = buildCaseResolverWorkspaceObservabilitySnapshot(events);

    expect(snapshot.sampleSize).toBe(6);
    expect(snapshot.persistAttempts).toBe(3);
    expect(snapshot.persistSuccesses).toBe(1);
    expect(snapshot.persistConflicts).toBe(1);
    expect(snapshot.persistFailures).toBe(1);
    expect(snapshot.conflictRate).toBe(1 / 3);
    expect(snapshot.saveSuccessRate).toBe(1 / 3);
    expect(snapshot.actionCounts['persist_attempt']).toBe(3);
    expect(snapshot.persistDurationMs.p95).toBe(250);
    expect(snapshot.payloadBytes.max).toBe(1_400);
  });

  it('includes payload rejection events in failure counts', () => {
    const events: CaseResolverWorkspaceDebugEvent[] = [
      buildEvent({ action: 'persist_attempt', payloadBytes: 2_000_000 }),
      buildEvent({ action: 'persist_rejected_payload_too_large', durationMs: 1 }),
    ];

    const snapshot = buildCaseResolverWorkspaceObservabilitySnapshot(events);

    expect(snapshot.persistAttempts).toBe(1);
    expect(snapshot.persistFailures).toBe(1);
    expect(snapshot.saveSuccessRate).toBe(0);
  });

  it('extracts latest hydration source selection and requested-context summary', () => {
    const events: CaseResolverWorkspaceDebugEvent[] = [
      buildEvent({
        id: 'event-hydration-1',
        timestamp: '2026-02-24T10:00:00.000Z',
        action: 'hydrate_workspace_source_selected',
        workspaceRevision: 0,
        message: 'source=store reason=store_only has_store=true has_heavy=false',
      }),
      buildEvent({
        id: 'event-requested-1',
        timestamp: '2026-02-24T10:00:02.000Z',
        action: 'requested_context_loading',
        message:
          'requested_file_id=case-a request_key=case-a|0 in_flight=case-a|0 attempted_key=case-a|0 resolved_via=snapshot_fetch requested_case_status=loading requested_case_issue=none',
      }),
      buildEvent({
        id: 'event-hydration-2',
        timestamp: '2026-02-24T10:00:03.000Z',
        action: 'hydrate_workspace_source_selected',
        workspaceRevision: 4,
        message:
          'source=heavy reason=equal_revision_current_placeholder has_store=true has_heavy=true',
      }),
      buildEvent({
        id: 'event-requested-2',
        timestamp: '2026-02-24T10:00:04.000Z',
        action: 'requested_context_missing_fetch_failed',
        message:
          'requested_file_id=case-a request_key=case-a|1 in_flight=none attempted_key=case-a|1 resolved_via=watchdog requested_case_status=missing requested_case_issue=workspace_unavailable',
      }),
      buildEvent({
        id: 'event-runtime-counter-1',
        timestamp: '2026-02-24T10:00:05.000Z',
        action: 'selector_recompute_count',
        message: 'count=4',
      }),
      buildEvent({
        id: 'event-runtime-counter-2',
        timestamp: '2026-02-24T10:00:06.000Z',
        action: 'selector_recompute_count',
        message: 'count=3',
      }),
      buildEvent({
        id: 'event-runtime-counter-3',
        timestamp: '2026-02-24T10:00:07.000Z',
        action: 'context_state_transition_count',
        message: 'count=2',
      }),
      buildEvent({
        id: 'event-runtime-duration-1',
        timestamp: '2026-02-24T10:00:08.000Z',
        action: 'tree_scope_resolve_ms',
        durationMs: 2,
      }),
      buildEvent({
        id: 'event-runtime-duration-2',
        timestamp: '2026-02-24T10:00:09.000Z',
        action: 'tree_scope_resolve_ms',
        durationMs: 8,
      }),
      buildEvent({
        id: 'event-runtime-duration-3',
        timestamp: '2026-02-24T10:00:10.000Z',
        action: 'case_search_filter_ms',
        durationMs: 5,
      }),
      buildEvent({
        id: 'event-runtime-duration-4',
        timestamp: '2026-02-24T10:00:11.000Z',
        action: 'editor_dirty_eval_ms',
        durationMs: 3,
      }),
    ];

    const snapshot = buildCaseResolverWorkspaceObservabilitySnapshot(events);

    expect(snapshot.latestHydrationSelection).toEqual({
      timestamp: '2026-02-24T10:00:03.000Z',
      source: 'heavy',
      reason: 'equal_revision_current_placeholder',
      hasStore: true,
      hasHeavy: true,
      workspaceRevision: 4,
    });
    expect(snapshot.latestRequestedContext).toEqual({
      timestamp: '2026-02-24T10:00:04.000Z',
      action: 'requested_context_missing_fetch_failed',
      requestKey: 'case-a|1',
      requestedCaseStatus: 'missing',
      requestedCaseIssue: 'workspace_unavailable',
      resolvedVia: 'watchdog',
    });
    expect(snapshot.runtimeCounters).toEqual({
      selectorRecomputeCount: 7,
      contextStateTransitionCount: 2,
    });
    expect(snapshot.runtimeDurations.treeScopeResolveMs).toMatchObject({
      count: 2,
      p50: 2,
      p95: 2,
      max: 8,
    });
    expect(snapshot.runtimeDurations.caseSearchFilterMs).toMatchObject({
      count: 1,
      p50: 5,
      p95: 5,
      max: 5,
    });
    expect(snapshot.runtimeDurations.editorDirtyEvalMs).toMatchObject({
      count: 1,
      p50: 3,
      p95: 3,
      max: 3,
    });
  });
});
