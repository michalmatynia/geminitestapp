import { describe, expect, it } from 'vitest';

import type {
  CaseResolverWorkspaceDebugEvent,
  CaseResolverWorkspaceObservabilitySnapshot,
} from '@/shared/contracts/case-resolver';

import {
  buildCaseResolverWorkspaceDebugMetrics,
  buildCaseResolverWorkspaceEventLines,
  buildCaseResolverWorkspaceHydrationLines,
  buildCaseResolverWorkspaceRequestedContextLines,
  formatCaseResolverWorkspaceDebugBoolean,
  getRecentCaseResolverWorkspaceDebugEvents,
} from './CaseResolverWorkspaceDebugPanel.helpers';

const createEvent = (
  overrides: Partial<CaseResolverWorkspaceDebugEvent> = {}
): CaseResolverWorkspaceDebugEvent => ({
  id: overrides.id ?? 'event-1',
  timestamp: overrides.timestamp ?? '2026-01-01T00:00:00.000Z',
  source: overrides.source ?? 'panel',
  action: overrides.action ?? 'persist_success',
  ...overrides,
});

const createSnapshot = (
  overrides: Partial<CaseResolverWorkspaceObservabilitySnapshot> = {}
): CaseResolverWorkspaceObservabilitySnapshot => ({
  generatedAt: '2026-01-01T00:00:00.000Z',
  sampleSize: 3,
  actionCounts: {},
  persistAttempts: 3,
  persistSuccesses: 2,
  persistConflicts: 1,
  persistFailures: 0,
  conflictRate: 1 / 3,
  saveSuccessRate: 2 / 3,
  persistDurationMs: { count: 3, p50: 10, p95: 25.4, max: 30 },
  payloadBytes: { count: 3, p50: 256, p95: 1024.2, max: 2048 },
  runtimeCounters: {
    selectorRecomputeCount: 0,
    contextStateTransitionCount: 0,
  },
  runtimeDurations: {
    treeScopeResolveMs: { count: 0, p50: 0, p95: 0, max: 0 },
    caseSearchFilterMs: { count: 0, p50: 0, p95: 0, max: 0 },
    editorDirtyEvalMs: { count: 0, p50: 0, p95: 0, max: 0 },
  },
  latestHydrationSelection: null,
  latestRequestedContext: null,
  ...overrides,
});

describe('CaseResolverWorkspaceDebugPanel.helpers', () => {
  it('formats booleans, metrics, hydration, requested context, and event detail lines', () => {
    expect(formatCaseResolverWorkspaceDebugBoolean(true)).toBe('true');
    expect(formatCaseResolverWorkspaceDebugBoolean(false)).toBe('false');
    expect(formatCaseResolverWorkspaceDebugBoolean(null)).toBe('n/a');

    expect(buildCaseResolverWorkspaceDebugMetrics(createSnapshot())).toEqual([
      { label: 'save p95', value: '25ms' },
      { label: 'payload p95', value: '1024B' },
      { label: 'success', value: '66.7%' },
      { label: 'conflict', value: '33.3%' },
    ]);

    expect(
      buildCaseResolverWorkspaceHydrationLines({
        timestamp: '2026-01-02T00:00:00.000Z',
        source: 'store',
        reason: 'cache_hit',
        hasStore: true,
        hasHeavy: null,
        workspaceRevision: 7,
      })
    ).toEqual([
      'source=store reason=cache_hit',
      'has_store=true has_heavy=n/a rev=7',
    ]);

    expect(
      buildCaseResolverWorkspaceRequestedContextLines({
        timestamp: '2026-01-02T00:00:00.000Z',
        action: 'requested_context_open_case',
        requestKey: 'case-1',
        requestedCaseStatus: 'open',
        requestedCaseIssue: null,
        resolvedVia: 'sidebar',
      })
    ).toEqual([
      'action=requested_context_open_case',
      'status=open issue=n/a via=sidebar',
      'request_key=case-1',
    ]);

    expect(
      buildCaseResolverWorkspaceEventLines(
        createEvent({
          workspaceRevision: 5,
          expectedRevision: 4,
          currentRevision: 5,
          mutationId: 'mut-1',
          durationMs: 120,
          payloadBytes: 2048,
        })
      )
    ).toEqual([
      'rev=5 exp=4 cur=5 mut=mut-1',
      'dur=120ms size=2048B',
    ]);
  });

  it('returns recent events in reverse chronological order and applies the limit', () => {
    const events = [
      createEvent({ id: 'event-1' }),
      createEvent({ id: 'event-2' }),
      createEvent({ id: 'event-3' }),
      createEvent({ id: 'event-4' }),
    ];

    expect(getRecentCaseResolverWorkspaceDebugEvents(events, 3).map((event) => event.id)).toEqual([
      'event-4',
      'event-3',
      'event-2',
    ]);
  });
});
