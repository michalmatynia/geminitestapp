import { describe, expect, it } from 'vitest';

import { normalizeNodeStatus } from '../utils';

describe('runtime analytics utils', () => {
  it('normalizes canonical runtime node statuses', () => {
    expect(normalizeNodeStatus('  WAITING_CALLBACK  ')).toBe('waiting_callback');
    expect(normalizeNodeStatus('processing')).toBe('processing');
    expect(normalizeNodeStatus('skipped')).toBe('skipped');
  });

  it('keeps legacy started status for analytics compatibility', () => {
    expect(normalizeNodeStatus('started')).toBe('started');
  });

  it('rejects unsupported statuses', () => {
    expect(normalizeNodeStatus('dead_lettered')).toBeNull();
    expect(normalizeNodeStatus('')).toBeNull();
    expect(normalizeNodeStatus(null)).toBeNull();
  });
});
