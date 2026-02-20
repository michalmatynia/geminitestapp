import { describe, expect, it } from 'vitest';

import {
  buildCaseResolverWorkspaceObservabilitySnapshot,
} from '@/features/case-resolver/workspace-observability';
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
});
