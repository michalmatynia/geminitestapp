import { describe, expect, it } from 'vitest';

import {
  mergeNodeOutputsForStatus,
  shouldCaptureRuntimeProfileHighlight,
  toRuntimeNodeStatus,
} from '@/features/ai/ai-paths/services/path-run-executor.logic';

describe('toRuntimeNodeStatus', () => {
  it('preserves explicit node terminal statuses', () => {
    expect(toRuntimeNodeStatus('completed')).toBe('completed');
    expect(toRuntimeNodeStatus('failed')).toBe('failed');
    expect(toRuntimeNodeStatus('blocked')).toBe('blocked');
  });

  it('rejects non-node run statuses', () => {
    expect(toRuntimeNodeStatus('paused')).toBeNull();
    expect(toRuntimeNodeStatus('dead_lettered')).toBeNull();
  });

  it('returns null for unsupported values', () => {
    expect(toRuntimeNodeStatus('')).toBeNull();
    expect(toRuntimeNodeStatus('unknown_status')).toBeNull();
    expect(toRuntimeNodeStatus(undefined)).toBeNull();
    expect(toRuntimeNodeStatus(null)).toBeNull();
  });
});

describe('mergeNodeOutputsForStatus', () => {
  it('clears stale blocked diagnostics when status moves to completed', () => {
    const merged = mergeNodeOutputsForStatus({
      previous: {
        status: 'blocked',
        blockedReason: 'missing_inputs',
        waitingOnPorts: ['prompt'],
        requiredPorts: ['prompt'],
        message: 'Waiting on prompt',
      },
      next: {
        prompt: 'resolved',
      },
      status: 'completed',
    });

    expect(merged['status']).toBe('completed');
    expect(merged['prompt']).toBe('resolved');
    expect(merged['blockedReason']).toBeUndefined();
    expect(merged['waitingOnPorts']).toBeUndefined();
    expect(merged['requiredPorts']).toBeUndefined();
    expect(merged['message']).toBeUndefined();
  });

  it('preserves waiting diagnostics for waiting_callback status', () => {
    const merged = mergeNodeOutputsForStatus({
      previous: {
        status: 'waiting_callback',
        blockedReason: 'missing_inputs',
        waitingOnPorts: ['value'],
        requiredPorts: ['value'],
        skipReason: 'missing_inputs',
        message: 'Waiting on model output',
      },
      next: {
        status: 'waiting_callback',
        waitingOnPorts: ['value'],
      },
      status: 'waiting_callback',
    });

    expect(merged['status']).toBe('waiting_callback');
    expect(merged['blockedReason']).toBe('missing_inputs');
    expect(merged['waitingOnPorts']).toEqual(['value']);
    expect(merged['requiredPorts']).toEqual(['value']);
    expect(merged['skipReason']).toBe('missing_inputs');
  });

  it('clears stale error when status is no longer failed', () => {
    const merged = mergeNodeOutputsForStatus({
      previous: {
        status: 'failed',
        error: 'old error',
      },
      next: {
        result: 'ok',
      },
      status: 'completed',
    });

    expect(merged['status']).toBe('completed');
    expect(merged['result']).toBe('ok');
    expect(merged['error']).toBeUndefined();
  });

  it('clears stale error when a failed update omits error details', () => {
    const merged = mergeNodeOutputsForStatus({
      previous: {
        status: 'failed',
        error: 'upstream stale error',
      },
      next: {
        result: '',
      },
      status: 'failed',
    });

    expect(merged['status']).toBe('failed');
    expect(merged['result']).toBe('');
    expect(merged['error']).toBeUndefined();
  });
});

describe('shouldCaptureRuntimeProfileHighlight', () => {
  it('captures validation-skipped node events for profile highlights', () => {
    expect(
      shouldCaptureRuntimeProfileHighlight({
        type: 'node',
        runId: 'run-1',
        runStartedAt: '2026-03-05T10:00:00.000Z',
        nodeId: 'node-1',
        nodeType: 'trigger',
        iteration: 1,
        status: 'skipped',
        durationMs: 4,
        reason: 'validation',
      })
    ).toBe(true);
  });
});
