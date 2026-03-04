import { describe, expect, it } from 'vitest';

import { toRuntimeNodeStatus } from '@/features/ai/ai-paths/services/path-run-executor.logic';

describe('toRuntimeNodeStatus', () => {
  it('preserves explicit node terminal statuses', () => {
    expect(toRuntimeNodeStatus('completed')).toBe('completed');
    expect(toRuntimeNodeStatus('failed')).toBe('failed');
    expect(toRuntimeNodeStatus('blocked')).toBe('blocked');
  });

  it('normalizes run-status aliases to node statuses', () => {
    expect(toRuntimeNodeStatus('paused')).toBe('running');
    expect(toRuntimeNodeStatus('dead_lettered')).toBe('failed');
  });

  it('returns null for unsupported values', () => {
    expect(toRuntimeNodeStatus('')).toBeNull();
    expect(toRuntimeNodeStatus('unknown_status')).toBeNull();
    expect(toRuntimeNodeStatus(undefined)).toBeNull();
    expect(toRuntimeNodeStatus(null)).toBeNull();
  });
});
