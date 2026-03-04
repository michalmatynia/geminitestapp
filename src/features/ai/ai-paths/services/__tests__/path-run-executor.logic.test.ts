import { describe, expect, it } from 'vitest';

import {
  mergeNodeOutputsForStatus,
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
