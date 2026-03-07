import { beforeEach, describe, expect, it } from 'vitest';

import {
  getPortablePathRunExecutionSnapshot,
  recordPortablePathRunExecutionAttempt,
  recordPortablePathRunExecutionFailure,
  recordPortablePathRunExecutionSuccess,
  registerPortablePathRunExecutionHook,
  resetPortablePathRunExecutionSnapshot,
} from '../portable-engine-observability';

describe('portable AI-path run execution observability', () => {
  beforeEach(() => {
    resetPortablePathRunExecutionSnapshot();
  });

  it('records counters and composes informative failure messages from object-like errors', () => {
    recordPortablePathRunExecutionAttempt({
      runner: 'client',
      surface: 'canvas',
    });

    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: 'canvas',
      source: null,
      validateBeforeRun: true,
      validationMode: 'strict',
      durationMs: 12.6,
      failureStage: 'resolve',
      error: {
        name: 'PortableResolveError',
        code: 'E_RESOLVE',
        detail: 'missing package payload',
      },
    });

    const snapshot = getPortablePathRunExecutionSnapshot();
    expect(snapshot.totals.attempts).toBe(1);
    expect(snapshot.totals.successes).toBe(0);
    expect(snapshot.totals.failures).toBe(1);
    expect(snapshot.byRunner.client.attempts).toBe(1);
    expect(snapshot.byRunner.client.failures).toBe(1);
    expect(snapshot.bySurface.canvas.attempts).toBe(1);
    expect(snapshot.bySurface.canvas.failures).toBe(1);
    expect(snapshot.bySource.path_config.attempts).toBe(0);
    expect(snapshot.failureStageCounts.resolve).toBe(1);
    expect(snapshot.recentEvents).toHaveLength(1);
    expect(snapshot.recentEvents[0]?.error).toBe(
      'PortableResolveError: missing package payload (code: E_RESOLVE)'
    );
    expect(snapshot.recentEvents[0]?.durationMs).toBe(13);
  });

  it('isolates hook failures and protects internal snapshot state from hook mutations', () => {
    const observedAttemptTotals: number[] = [];
    const unsubscribeA = registerPortablePathRunExecutionHook((_event, snapshot) => {
      observedAttemptTotals.push(snapshot.totals.attempts);
      snapshot.totals.attempts = 999;
    });
    const unsubscribeB = registerPortablePathRunExecutionHook(() => {
      throw new Error('hook failure');
    });

    recordPortablePathRunExecutionAttempt({
      runner: 'server',
      surface: 'api',
    });
    expect(() =>
      recordPortablePathRunExecutionSuccess({
        runner: 'server',
        surface: 'api',
        source: 'path_config',
        validateBeforeRun: false,
        validationMode: null,
        durationMs: 7,
      })
    ).not.toThrow();

    unsubscribeA();
    unsubscribeB();

    recordPortablePathRunExecutionAttempt({
      runner: 'server',
      surface: 'api',
    });
    recordPortablePathRunExecutionSuccess({
      runner: 'server',
      surface: 'api',
      source: 'path_config',
      validateBeforeRun: false,
      validationMode: null,
      durationMs: 3,
    });

    const snapshot = getPortablePathRunExecutionSnapshot();
    expect(observedAttemptTotals).toEqual([1]);
    expect(snapshot.totals.attempts).toBe(2);
    expect(snapshot.totals.successes).toBe(2);
  });

  it('keeps only the most recent run execution events at the configured cap', () => {
    for (let i = 0; i < 105; i += 1) {
      recordPortablePathRunExecutionAttempt({
        runner: 'client',
        surface: 'product',
      });
      recordPortablePathRunExecutionFailure({
        runner: 'client',
        surface: 'product',
        source: 'path_config',
        validateBeforeRun: false,
        validationMode: null,
        durationMs: i + 0.4,
        failureStage: 'runtime',
        error: `runtime failure ${i}`,
      });
    }

    const snapshot = getPortablePathRunExecutionSnapshot();
    expect(snapshot.totals.attempts).toBe(105);
    expect(snapshot.totals.failures).toBe(105);
    expect(snapshot.failureStageCounts.runtime).toBe(105);
    expect(snapshot.recentEvents).toHaveLength(100);
    expect(snapshot.recentEvents[0]?.error).toBe('runtime failure 5');
    expect(snapshot.recentEvents[snapshot.recentEvents.length - 1]?.error).toBe(
      'runtime failure 104'
    );
  });

  it('uses bounded fallback text for unserializable or oversized throw values', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    recordPortablePathRunExecutionAttempt({
      runner: 'client',
      surface: 'canvas',
    });
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: 'canvas',
      source: 'path_config',
      validateBeforeRun: true,
      validationMode: 'strict',
      durationMs: 2,
      failureStage: 'runtime',
      error: circular,
    });

    const longMessage = 'x'.repeat(800);
    recordPortablePathRunExecutionAttempt({
      runner: 'client',
      surface: 'canvas',
    });
    recordPortablePathRunExecutionFailure({
      runner: 'client',
      surface: 'canvas',
      source: 'path_config',
      validateBeforeRun: true,
      validationMode: 'strict',
      durationMs: 1,
      failureStage: 'runtime',
      error: longMessage,
    });

    const snapshot = getPortablePathRunExecutionSnapshot();
    expect(snapshot.recentEvents[0]?.error).toBe(
      'Unserializable portable engine runtime error object.'
    );
    const truncated = snapshot.recentEvents[1]?.error ?? '';
    expect(truncated.length).toBe(320);
    expect(truncated.endsWith('...')).toBe(true);
  });
});
